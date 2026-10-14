import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") throw new Error("Backup drill only supports the isolated local backend.");
if (!process.argv.includes("--confirm-local-backup")) throw new Error("Read docs/operations.md, then pass --confirm-local-backup. Keep encrypted backup and key private.");
const container = "supabase_db_rentcheck-accounts-test", suffix = randomUUID().replaceAll("-", ""), scratch = "rentcheck_restore_" + suffix, temporary = "/tmp/" + scratch + ".dump";
const output = "work/backups/" + scratch; mkdirSync(output, { recursive: true });
const keyPath = "work/backup-key.bin";
if (!existsSync(keyPath)) writeFileSync(keyPath, randomBytes(32), { mode: 0o600 });
const key = readFileSync(keyPath); if (key.length !== 32) throw new Error("Invalid backup key.");
function encrypt(bytes) { const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv); return Buffer.concat([iv, cipher.update(bytes), cipher.final(), cipher.getAuthTag()]); }
function decrypt(bytes) { const cipher = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12)); cipher.setAuthTag(bytes.subarray(-16)); return Buffer.concat([cipher.update(bytes.subarray(12, -16)), cipher.final()]); }
const docker = (...args) => execFileSync("docker", ["exec", container, ...args], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 });
const sql = (database, statement) => docker("psql", "-U", "supabase_admin", "-d", database, "-v", "ON_ERROR_STOP=1", "-At", "-c", statement).toString().trim();
const summarySql = `select jsonb_build_object('users',(select count(*) from auth.users),'properties',(select count(*) from public.properties),'reviews',(select count(*) from public.reviews),'documents',(select count(*) from private.documents),'audit',(select count(*) from private.audit_events),'migrations',(select count(*) from supabase_migrations.schema_migrations))`;
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const scratchBucket = "restore-" + suffix;
const probePath = "backup-probe/" + suffix + ".jpg";
let probeCreated = false;
let databaseCreated = false, bucketCreated = false; const uploaded = [];
try {
  const probe = await service.storage.from("rental-documents").upload(probePath, await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).jpeg().toBuffer(), { contentType: "image/jpeg" });
  if (probe.error) throw new Error("Synthetic backup probe upload failed.");
  probeCreated = true;
  const before = sql("postgres", summarySql);
  docker("pg_dump", "-U", "supabase_admin", "-d", "postgres", "--format=custom", "--file=" + temporary);
  const dump = docker("cat", temporary), sealed = encrypt(dump); writeFileSync(output + "/database.enc", sealed);
  const verifiedDump = decrypt(readFileSync(output + "/database.enc")); if (!verifiedDump.equals(dump)) throw new Error("Backup encryption round trip failed.");
  const files = [];
  async function collect(bucket, prefix = "") {
    for (let offset = 0; ; offset += 100) {
      const list = await service.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } }); if (list.error) throw new Error("Storage inventory failed.");
      for (const entry of list.data) {
        const objectPath = prefix ? prefix + "/" + entry.name : entry.name;
        if (!entry.id) { await collect(bucket, objectPath); continue; }
        const result = await service.storage.from(bucket).download(objectPath); if (result.error) throw new Error("Storage backup download failed.");
        const bytes = Buffer.from(await result.data.arrayBuffer()), file = `object-${files.length}.enc`;
        writeFileSync(output + "/" + file, encrypt(bytes)); files.push({ bucket, path: objectPath, file, mime: result.data.type, hash: createHash("sha256").update(bytes).digest("hex") });
      }
      if (list.data.length < 100) break;
    }
  }
  for (const bucket of ["review-photos", "rental-documents"]) await collect(bucket);
  writeFileSync(output + "/manifest.enc", encrypt(Buffer.from(JSON.stringify(files))));
  docker("createdb", "-U", "supabase_admin", "--template=template0", scratch); databaseCreated = true;
  docker("pg_restore", "-U", "supabase_admin", "--no-owner", "--exit-on-error", "--dbname=" + scratch, temporary);
  const restored = sql(scratch, summarySql); if (restored !== before || sql("postgres", summarySql) !== before) throw new Error("Database changed during backup or restored counts differ. Repeat with writes paused.");
  const boundary = sql(scratch, `select not has_function_privilege('anon','public.get_my_conversations()','EXECUTE') and not has_function_privilege('authenticated','public.register_evidence_document(uuid,uuid,text,uuid,uuid,uuid,boolean,boolean)','EXECUTE') and (select relrowsecurity from pg_class where oid='public.properties'::regclass)`);
  if (boundary !== "t") throw new Error("Restored authorization checks failed.");
  const made = await service.storage.createBucket(scratchBucket, { public: false }); if (made.error) throw new Error("Scratch storage creation failed."); bucketCreated = true;
  const manifest = JSON.parse(decrypt(readFileSync(output + "/manifest.enc")).toString());
  for (const [index, object] of manifest.entries()) {
    const bytes = decrypt(readFileSync(output + "/" + object.file)), restorePath = "object-" + index;
    if (createHash("sha256").update(bytes).digest("hex") !== object.hash) throw new Error("Backup object checksum failed.");
    const stored = await service.storage.from(scratchBucket).upload(restorePath, bytes, { contentType: object.mime || "application/octet-stream" }); if (stored.error) throw new Error("Scratch object restore failed."); uploaded.push(restorePath);
    const downloaded = await service.storage.from(scratchBucket).download(restorePath); if (downloaded.error || createHash("sha256").update(Buffer.from(await downloaded.data.arrayBuffer())).digest("hex") !== object.hash) throw new Error("Restored object checksum failed.");
  }
  writeFileSync(output + "/report.json", JSON.stringify({ databaseRestored: true, countsMatched: true, authorizationPreserved: true, storageObjectsChecked: files.length, checkedAt: new Date().toISOString() }, null, 2));
  console.log("PASS: encrypted database restored to an isolated scratch database; counts/permissions matched and " + files.length + " storage objects round-tripped. Private backups are under work/backups; keep the key separately.");
} catch (error) { writeFileSync(output + "/diagnostic.enc", encrypt(Buffer.from(String(error.stderr ?? error.message)))); console.error("Backup drill failed; raw database or storage errors were withheld. Preserve private work files for operator inspection."); process.exitCode = 1; }
finally {
  if (probeCreated) { const removedProbe = await service.storage.from("rental-documents").remove([probePath]); if (removedProbe.error) { console.error("Synthetic backup probe cleanup needs operator attention."); process.exitCode = 1; } }
  try { if (databaseCreated) docker("dropdb", "-U", "supabase_admin", scratch); docker("rm", "-f", temporary); } catch { console.error("Scratch database/file cleanup needs operator attention."); process.exitCode = 1; }
  if (bucketCreated) { if (uploaded.length) { const removed = await service.storage.from(scratchBucket).remove(uploaded); if (removed.error) process.exitCode = 1; } const removedBucket = await service.storage.deleteBucket(scratchBucket); if (removedBucket.error) { console.error("Scratch bucket cleanup needs operator attention."); process.exitCode = 1; } }
}
