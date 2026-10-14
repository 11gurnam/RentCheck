import sharp from "sharp";
export async function normalizePhoto(file: File) {
  if (
    file.size === 0 ||
    file.size > 3145728 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("Use a JPEG, PNG or WebP photo up to 3 MiB.");
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { limitInputPixels: 20000000, failOn: "warning" });
  const metadata = await image.metadata();
  const format = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];
  if (metadata.format !== format || (metadata.pages && metadata.pages > 1))
    throw new Error("Photo content does not match its type, or is animated.");
  const output = await image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
  if (output.byteLength > 3145728) throw new Error("Processed photo exceeds 3 MiB.");
  return output;
}
