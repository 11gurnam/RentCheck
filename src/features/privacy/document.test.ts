import { it, expect } from "vitest";
import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { normalizeDocument } from "./document";
async function pdfFile(doc: PDFDocument) {
  return new File([Buffer.from(await doc.save())], "fictional.pdf", {
    type: "application/pdf",
  });
}
it("rewrites bounded PDF pages, removes metadata and annotations", async () => {
  const input = await PDFDocument.create();
  const page = input.addPage();
  page.drawText("Fictional rental agreement for tests only");
  input.setAuthor("Private original author");
  input.setTitle("Private original title");
  page.node.set(
    PDFName.of("Annots"),
    input.context.obj([
      {
        Type: "Annot",
        Subtype: "Text",
        Contents: PDFString.of("Private annotation"),
      },
    ]),
  );
  const result = await normalizeDocument(await pdfFile(input));
  expect(result.mime).toBe("application/pdf");
  const clean = await PDFDocument.load(result.bytes);
  expect(clean.getPageCount()).toBe(1);
  expect(clean.getAuthor()).toBe("");
  expect(clean.getTitle()).toBe("Rental evidence");
  expect(clean.getPages()[0].node.has(PDFName.of("Annots"))).toBe(false);
});
it("rejects scripts and attached active content instead of preserving it", async () => {
  const input = await PDFDocument.create();
  input.addPage();
  input.addJavaScript("bad", "app.alert('Synthetic test script')");
  await expect(normalizeDocument(await pdfFile(input))).rejects.toThrow();
  const attached = await PDFDocument.create();
  attached.addPage();
  await attached.attach(Buffer.from("fictional attachment"), "attachment.txt");
  await expect(normalizeDocument(await pdfFile(attached))).rejects.toThrow();
});
it("rejects malformed and excessive documents", async () => {
  await expect(
    normalizeDocument(
      new File(["%PDF-1.7\nnot a pdf"], "fake.pdf", {
        type: "application/pdf",
      }),
    ),
  ).rejects.toThrow();
  const large = await PDFDocument.create();
  for (let n = 0; n < 31; n++) large.addPage();
  await expect(normalizeDocument(await pdfFile(large))).rejects.toThrow();
  await expect(
    normalizeDocument(
      new File([new Uint8Array(3145729)], "oversize.pdf", {
        type: "application/pdf",
      }),
    ),
  ).rejects.toThrow();
});
