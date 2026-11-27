export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxBytes?: number;
}

export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  const { maxWidth = 400, maxHeight = 400, quality = 0.8, maxBytes = 50 * 1024 } = options;
  if (!Number.isFinite(maxWidth) || maxWidth < 1 || !Number.isFinite(maxHeight) || maxHeight < 1 ||
      !Number.isFinite(quality) || quality <= 0 || quality > 1 || !Number.isFinite(maxBytes) || maxBytes < 1024) {
    throw new Error('Invalid image compression options.');
  }
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read this image. Please choose another file.'));
      img.src = source;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Could not read this image. Please choose another file.');
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.floor(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image compression is unavailable in this browser.');
    // JPEG has no alpha channel; keep transparent uploads on a white background.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let currentQuality = quality;
    while (true) {
      const result = canvas.toDataURL('image/jpeg', currentQuality);
      if (!result.startsWith('data:image/jpeg;base64,')) throw new Error('Image compression is unavailable in this browser.');
      if (result.length <= maxBytes) return result;
      if (currentQuality <= 0.2) throw new Error('Image is too complex. Please choose a smaller image.');
      currentQuality = Math.max(0.2, currentQuality - 0.1);
    }
  } finally {
    URL.revokeObjectURL(source);
  }
}
