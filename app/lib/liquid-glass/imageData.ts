/** Browser ImageData helpers (replaces node-canvas from kube’s article source). */

export function createImageData(width: number, height: number): ImageData {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  if (typeof ImageData !== "undefined") {
    return new ImageData(w, h);
  }
  // SSR / non-DOM fallback — enough for typed consumers; never drawn.
  const data = new Uint8ClampedArray(w * h * 4);
  return { data, width: w, height: h, colorSpace: "srgb" } as ImageData;
}

export function imageDataToUrl(imageData: ImageData): string {
  if (typeof document === "undefined") {
    return "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";
  }
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}
