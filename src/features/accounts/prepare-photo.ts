/** Resize before sending so a 5 MiB original fits the server-action request limit. */
export async function prepareProfilePhoto(file: File): Promise<File> {
  if (!file.size || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use a valid JPEG, PNG or WebP photo up to 5 MiB.");
  const image = await createImageBitmap(file);
  try {
    if(image.width*image.height>20000000)throw new Error("Photo dimensions are too large");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo preview unavailable");
    const side = Math.min(image.width, image.height);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Photo processing failed")), "image/jpeg", 0.85));
    return new File([blob], "profile.jpg", { type: "image/jpeg" });
  } finally { image.close(); }
}
