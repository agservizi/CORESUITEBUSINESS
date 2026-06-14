const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 180_000;
const MAX_WIDTH = 240;

export function validateLogoFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato non supportato. Usa PNG, JPG o WebP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "File troppo grande. Massimo 2 MB.";
  }
  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossibile leggere l'immagine"));
    };
    img.src = url;
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL("image/jpeg", quality);
}

export async function processStoreLogo(file: File): Promise<string> {
  const validationError = validateLogoFile(file);
  if (validationError) throw new Error(validationError);

  const img = await loadImage(file);
  const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.92;
  let dataUrl = canvasToDataUrl(canvas, quality);
  while (dataUrl.length > MAX_OUTPUT_BYTES && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvasToDataUrl(canvas, quality);
  }

  if (dataUrl.length > MAX_OUTPUT_BYTES) {
    throw new Error("Logo troppo complesso. Prova un'immagine più semplice o più piccola.");
  }

  return dataUrl;
}
