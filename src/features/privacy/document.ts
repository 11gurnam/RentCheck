import { Worker } from "node:worker_threads";
import { normalizePhoto } from "../reviews/image";
const limit = 3 * 1024 * 1024;
// Run the PDF parser in a bounded worker. No user PDF scripts or external links execute.
const workerSource = String.raw`
const {parentPort}=require('node:worker_threads');
const {PDFDocument,PDFDict,PDFName}=require('pdf-lib');
parentPort.on('message',async(bytes)=>{try{
 const input=await PDFDocument.load(bytes,{ignoreEncryption:false,throwOnInvalidObject:true,updateMetadata:false});
 if(input.getPageCount()<1||input.getPageCount()>30)throw new Error('Page limit');
 const objects=input.context.enumerateIndirectObjects();if(objects.length>5000)throw new Error('Object limit');
 const forbidden=new Set(['JS','JavaScript','AA','OpenAction','EmbeddedFiles','EF','AF','XFA','RichMediaContent','RichMediaSettings','AcroForm']);
 const actions=new Set(['JavaScript','Launch','GoToR','GoToE','SubmitForm','ImportData','Rendition','Movie','Sound']);
 function inspect(value,seen=new Set()){
  if(seen.has(value))return;seen.add(value);
  if(value instanceof PDFDict){for(const [key,entry]of value.entries()){if(forbidden.has(key.decodeText()))throw new Error('Active or attached content');if(key.decodeText()==='S'&&entry instanceof PDFName&&actions.has(entry.decodeText()))throw new Error('Active action');inspect(entry,seen);}}
  else if(value&&typeof value.asArray==='function'){for(const entry of value.asArray())inspect(entry,seen);}
  else if(value&&value.dict instanceof PDFDict){inspect(value.dict,seen);}
 }
 for(const[,value]of objects)inspect(value);
 const clean=await PDFDocument.create();for(const page of await clean.copyPages(input,input.getPageIndices())){page.node.delete(PDFName.of('Annots'));page.node.delete(PDFName.of('AA'));clean.addPage(page);}
 clean.setTitle('Rental evidence');clean.setAuthor('');clean.setSubject('');clean.setKeywords([]);
 const output=await clean.save();if(output.byteLength>3145728)throw new Error('Output limit');parentPort.postMessage({bytes:output});
 }catch{parentPort.postMessage({error:true});}});
`;
export async function normalizeDocument(
  file: File,
): Promise<{
  bytes: Buffer;
  extension: "jpg" | "pdf";
  mime: "image/jpeg" | "application/pdf";
}> {
  if (!file.size || file.size > limit) throw new Error("Document size limit");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.subarray(0, 8).toString("ascii").startsWith("%PDF-"))
    return {
      bytes: await normalizePhoto(file),
      extension: "jpg",
      mime: "image/jpeg",
    };
  const clean = await new Promise<Buffer>((resolve, reject) => {
    const worker = new Worker(workerSource, {
      eval: true,
      env: {},
      stdout: true,
      stderr: true,
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 16,
        stackSizeMb: 4,
      },
    });
    worker.stdout.resume();
    worker.stderr.resume();
    const timeout = setTimeout(() => {
      void worker.terminate();
      reject(new Error("PDF processing timed out"));
    }, 15000);
    const finish = () => {
      clearTimeout(timeout);
      void worker.terminate();
    };
    worker.once("message", (result) => {
      finish();
      if (result.error) reject(new Error("Unsupported PDF"));
      else resolve(Buffer.from(result.bytes));
    });
    worker.once("error", () => {
      finish();
      reject(new Error("PDF processing failed"));
    });
    worker.once("exit", (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error("PDF processing stopped"));
      }
    });
    worker.postMessage(bytes);
  });
  return { bytes: clean, extension: "pdf", mime: "application/pdf" };
}
