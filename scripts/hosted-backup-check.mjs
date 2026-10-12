import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
if (!process.argv.includes('--confirm-hosted-backup')) throw new Error('Read docs/operations.md, then pass --confirm-hosted-backup. This reads the linked hosted project and restores only to local scratch resources.');
const directory = 'work/hosted-backup/' + new Date().toISOString().replaceAll(':','-') + '-' + randomUUID();
mkdirSync(directory, { recursive: true });
const env = parseEnv(readFileSync('.env.hosted.local', 'utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://qbvuwjyamktzwimisvet.supabase.co') throw new Error('Wrong hosted project');
if (readFileSync('supabase/.temp/project-ref','utf8').trim() !== 'qbvuwjyamktzwimisvet') throw new Error('CLI linked to wrong hosted project');
const localEnv = parseEnv(readFileSync('.env.local', 'utf8'));
if (localEnv.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54321') throw new Error('Wrong local restore backend');
const keyPath = 'work/hosted-backup-key.bin';
if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600 });
const key = readFileSync(keyPath);
if (key.length !== 32) throw new Error('Invalid encryption key');
const seal = bytes => { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv); return Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]); };
const open = bytes => { const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0,12)); cipher.setAuthTag(bytes.subarray(-16)); return Buffer.concat([cipher.update(bytes.subarray(12,-16)), cipher.final()]); };
const hosted = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession:false, autoRefreshToken:false }, global: { fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)}) } });
const local = createClient(localEnv.NEXT_PUBLIC_SUPABASE_URL, localEnv.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const requireData = result => {if(result.error)throw new Error('Provider operation failed');return result.data;};
const scratch = 'rentcheck_hosted_restore_' + randomUUID().replaceAll('-','');
const container = 'supabase_db_rentcheck-accounts-test';
const docker = args => execFileSync('docker',['exec',container,...args],{stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024});
const sql = statement => docker(['psql','-U','supabase_admin','-d',scratch,'-v','ON_ERROR_STOP=1','-At','-c',statement]).toString().trim();
const importSql = bytes => execFileSync('docker',['exec','-i',container,'psql','-U','supabase_admin','-d',scratch,'-v','ON_ERROR_STOP=1','--single-transaction'],{input:bytes,stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024});
let madeDatabase=false, madeBucket=false;
const localBucket='restore-'+scratch.slice(-32), uploaded=[];
try {
 const mode = requireData(await anon.rpc('get_operation_mode'));
 const settings = Array.isArray(mode)?mode[0]:mode;
 if(settings.accepts_real_data || settings.allows_demo_data)throw new Error('Hosted intake must remain closed');
 const dumps={};
 for(const name of ['schema','data','roles']) {
  const args=['db','dump','--linked','--file',`${directory}/${name}.sql`,'--agent','no','--output-format','text'];
  if(name==='roles') args.push('--role-only');
  else {args.push('--schema','public,private,auth,storage,supabase_migrations');if(name==='data')args.push('--data-only','--use-copy');}
  // Run the installed official launcher directly, without a shell or credentials in arguments.
  execFileSync(process.execPath,[resolve('node_modules/supabase/dist/supabase.js'),...args],{stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024,timeout:180000});
  const plaintext=existsSync(`${directory}/${name}.sql`) ? readFileSync(`${directory}/${name}.sql`) : open(readFileSync(`${directory}/${name}.enc`));
  writeFileSync(`${directory}/${name}.enc`,seal(plaintext));
  const restored=open(readFileSync(`${directory}/${name}.enc`));
  if(!plaintext.equals(restored))throw new Error('Encryption mismatch');
  dumps[name]=restored;
  if(existsSync(`${directory}/${name}.sql`)) unlinkSync(`${directory}/${name}.sql`);
 }
 const buckets=requireData(await hosted.storage.listBuckets());
 const manifest=[];
 async function collect(bucket,prefix='') {
  for(let offset=0;;offset+=100) {
   const entries=requireData(await hosted.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}}));
   for(const entry of entries) {
    const path=prefix?`${prefix}/${entry.name}`:entry.name;
    if(!entry.id){await collect(bucket,path);continue;}
    const blob=requireData(await hosted.storage.from(bucket).download(path)), bytes=Buffer.from(await blob.arrayBuffer());
    const file=`object-${manifest.length}.enc`;
    writeFileSync(`${directory}/${file}`,seal(bytes));
    manifest.push({bucket,path,file,mime:blob.type,hash:createHash('sha256').update(bytes).digest('hex')});
   }
   if(entries.length<100)break;
  }
 }
 for(const name of ['review-photos','rental-documents']) {
  if(!buckets.some(bucket=>bucket.name===name && bucket.public===false))throw new Error('Private bucket missing');
  await collect(name);
 }
 writeFileSync(`${directory}/manifest.enc`,seal(Buffer.from(JSON.stringify({buckets:buckets.filter(b=>['review-photos','rental-documents'].includes(b.name)),objects:manifest}))));
 docker(['createdb','-U','supabase_admin','--template=template0',scratch]); madeDatabase=true;
 sql('create schema extensions; create extension pg_trgm with schema extensions; create extension btree_gist with schema extensions; create extension pgcrypto with schema extensions; create extension "uuid-ossp" with schema extensions;');
 importSql(dumps.schema); importSql(dumps.data);
 const copyRows=[];
 for(const match of dumps.data.toString().matchAll(/COPY ("[^"]+"\."[^"]+") \([^\n]+\) FROM stdin;\r?\n([\s\S]*?)\\\./g)) {
  const expected=match[2].trimEnd()?match[2].trimEnd().split(/\r?\n/).length:0;
  if(Number(sql(`select count(*) from ${match[1]}`))!==expected)throw new Error('Restored table count differs');
  copyRows.push({table:match[1],count:expected});
 }
 if(copyRows.length<10)throw new Error('Incomplete data dump');
 const boundary=sql("select not has_schema_privilege('anon','private','USAGE') and not has_function_privilege('authenticated','public.register_evidence_document(uuid,uuid,text,uuid,uuid,uuid,boolean,boolean)','EXECUTE') and (select bool_and(relrowsecurity) from pg_class where oid in ('public.properties'::regclass,'public.reviews'::regclass,'public.public_profiles'::regclass))");
 if(boundary!=='t')throw new Error('Restored access boundary failed');
 const restoredMode=sql('select not allows_demo_data and not accepts_real_data from private.operation_settings');
 if(restoredMode!=='t')throw new Error('Restored intake mode differs');
 if(manifest.length) {requireData(await local.storage.createBucket(localBucket,{public:false}));madeBucket=true;}
 for(const [index,object] of manifest.entries()) {
  const bytes=open(readFileSync(`${directory}/${object.file}`));
  if(createHash('sha256').update(bytes).digest('hex')!==object.hash)throw new Error('Media checksum differs');
  requireData(await local.storage.from(localBucket).upload(`object-${index}`,bytes,{contentType:object.mime||'application/octet-stream'}));uploaded.push(`object-${index}`);
  const blob=requireData(await local.storage.from(localBucket).download(`object-${index}`));
  if(createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex')!==object.hash)throw new Error('Restored media checksum differs');
 }
 const report={checkedAt:new Date().toISOString(),encryptedExports:['schema','data','roles','manifest'],databaseRestored:true,tablesChecked:copyRows.length,authorizationPreserved:true,intakeStillClosed:true,storageObjectsRestored:manifest.length,rolesExportedNotAppliedToLocalCluster:true};
 writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
} catch(error) {
 writeFileSync(`${directory}/diagnostic.enc`,seal(Buffer.from(String(error.stderr??error.message))));
 console.error('Hosted restore drill failed; encrypted diagnostics saved privately.'); process.exitCode=1;
} finally {
 // A failed export must not leave plaintext authentication rows or role passwords behind.
 for(const name of ['schema','data','roles']) {
  const path=`${directory}/${name}.sql`;
  if(existsSync(path)) {writeFileSync(`${directory}/${name}.partial.enc`,seal(readFileSync(path)));unlinkSync(path);}
 }
 if(madeDatabase)docker(['dropdb','-U','supabase_admin',scratch]);
 if(madeBucket) {if(uploaded.length)requireData(await local.storage.from(localBucket).remove(uploaded));requireData(await local.storage.deleteBucket(localBucket));}
}
