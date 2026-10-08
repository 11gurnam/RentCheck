import { it, expect } from "vitest";
import sharp from "sharp";
import { normalizePhoto } from "./image";
it("rejects uploads over the hosted 3 MiB allowance before decoding", async () => {
  await expect(normalizePhoto(new File([new Uint8Array(3145729)], "large.jpg", { type: "image/jpeg" }))).rejects.toThrow("3 MiB");
});
it("rejects disguised files and strips image metadata by re-encoding", async () => {
  await expect(
    normalizePhoto(new File(["<svg/>"], "fake.jpg", { type: "image/jpeg" })),
  ).rejects.toThrow();
  await expect(
    normalizePhoto(new File(["x"], "fake.svg", { type: "image/svg+xml" })),
  ).rejects.toThrow();
  const bytes = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "green" },
  })
    .withMetadata()
    .png()
    .toBuffer();
  const out = await normalizePhoto(
    new File([new Uint8Array(bytes)], "fixture.png", { type: "image/png" }),
  );
  const metadata = await sharp(out).metadata();
  expect(metadata.format).toBe("jpeg");
  expect(metadata.width).toBe(1600);
  expect(metadata.exif).toBeUndefined();
  expect(metadata.icc).toBeUndefined();
});
