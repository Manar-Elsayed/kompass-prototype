/**
 * Read an image file as a JPEG data URL no wider or taller than `max` pixels. The prototype keeps
 * uploaded logos and photos in localStorage, so they are scaled down first to stay a few dozen KB.
 * SVG and small images are kept as they are.
 */
export function downscaleImage(file: File, max = 800, quality = 0.82): Promise<{ url: string; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const src = String(reader.result);
      if (file.type === "image/svg+xml") return resolve({ url: src, size: file.size });
      const img = new Image();
      img.onerror = () => reject(new Error("image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        if (scale === 1 && file.size < 150_000) return resolve({ url: src, size: file.size });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ url: src, size: file.size });
        ctx.fillStyle = "#fff"; // transparent PNGs would turn black as JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", quality);
        resolve({ url, size: Math.round((url.length - url.indexOf(",") - 1) * 0.75) });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
