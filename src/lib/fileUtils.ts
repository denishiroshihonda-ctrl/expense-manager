export interface ResizeResult {
  base64: string;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
}

export async function resizeImage(file: File): Promise<ResizeResult> {
  const originalSize = file.size;
  const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
  const isLargeFile = originalSize > LARGE_FILE_THRESHOLD;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler: ' + file.name));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao decodificar: ' + file.name));
      img.onload = () => {
        // Resolução maior para preservar texto legível
        const MAX = isLargeFile ? 1100 : 1200;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { reject(new Error('Dimensões inválidas')); return; }
        
        const needsResize = w > MAX || h > MAX;
        if (needsResize) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        
        // Qualidade maior para preservar texto legível (OCR precisa de nitidez)
        const quality = isLargeFile ? 0.70 : 0.75;
        let b64 = c.toDataURL('image/jpeg', quality).split(',')[1];
        
        // Se ainda estiver muito grande (>1.5MB em base64), comprimir um pouco mais
        if (b64.length > 1_500_000) {
          b64 = c.toDataURL('image/jpeg', 0.60).split(',')[1];
        }
        
        const finalSize = Math.round(b64.length * 0.75); // base64 é ~33% maior que binário
        
        resolve({
          base64: b64,
          wasCompressed: isLargeFile || needsResize,
          originalSize,
          finalSize
        });
      };
      img.src = (ev.target as FileReader).result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface PdfResult {
  base64: string;
  thumbUrl: string;
  wasCompressed: boolean;
  originalSize: number;
  finalSize: number;
}

export async function renderPdfPage(file: File): Promise<PdfResult> {
  const originalSize = file.size;
  const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024; // 2MB
  const isLargeFile = originalSize > LARGE_FILE_THRESHOLD;

  // @ts-ignore — loaded via CDN
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js não carregou. Recarregue a página.');

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);

  // Escala menor para arquivos grandes
  const scale = isLargeFile ? 0.9 : 1.2;
  const quality = isLargeFile ? 0.6 : 0.8;

  const vp = page.getViewport({ scale });
  const c = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
  const base64 = c.toDataURL('image/jpeg', quality).split(',')[1];

  const vt = page.getViewport({ scale: 0.25 });
  const ct = document.createElement('canvas');
  ct.width = vt.width; ct.height = vt.height;
  await page.render({ canvasContext: ct.getContext('2d')!, viewport: vt }).promise;
  const thumbUrl = URL.createObjectURL(
    await new Promise<Blob>((res) => ct.toBlob((b) => res(b!), 'image/jpeg', 0.6))
  );

  const finalSize = Math.round(base64.length * 0.75);

  return { 
    base64, 
    thumbUrl, 
    wasCompressed: isLargeFile,
    originalSize,
    finalSize
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
