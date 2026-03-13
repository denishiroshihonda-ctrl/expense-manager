export async function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler: ' + file.name));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao decodificar: ' + file.name));
      img.onload = () => {
        const MAX = 1200;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { reject(new Error('Dimensões inválidas')); return; }
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d')!.drawImage(img, 0, 0, w, h);
        let b64 = c.toDataURL('image/jpeg', 0.75).split(',')[1];
        if (b64.length > 900_000) b64 = c.toDataURL('image/jpeg', 0.55).split(',')[1];
        resolve(b64);
      };
      img.src = (ev.target as FileReader).result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function renderPdfPage(file: File): Promise<{ base64: string; thumbUrl: string }> {
  // @ts-ignore — loaded via CDN
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js não carregou. Recarregue a página.');

  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);

  const vp = page.getViewport({ scale: 1.2 });
  const c = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise;
  const base64 = c.toDataURL('image/jpeg', 0.8).split(',')[1];

  const vt = page.getViewport({ scale: 0.25 });
  const ct = document.createElement('canvas');
  ct.width = vt.width; ct.height = vt.height;
  await page.render({ canvasContext: ct.getContext('2d')!, viewport: vt }).promise;
  const thumbUrl = URL.createObjectURL(
    await new Promise<Blob>((res) => ct.toBlob((b) => res(b!), 'image/jpeg', 0.6))
  );

  return { base64, thumbUrl };
}
