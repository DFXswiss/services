import { downloadFile } from 'src/util/utils';

export function promoLandingUrl(code: string): string {
  return `https://realunit.app/promo/${encodeURIComponent(code)}`;
}

export function promoQrFilename(code: string, ext: 'png' | 'svg' | 'jpg'): string {
  const safe = code.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return `realunit-promo-${safe || 'code'}.${ext}`;
}

export function svgMarkup(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(clone);
}

export function downloadQrSvg(svg: SVGSVGElement, filename: string): void {
  downloadFile(new Blob([svgMarkup(svg)], { type: 'image/svg+xml;charset=utf-8' }), {}, filename);
}

export function downloadQrRaster(
  svg: SVGSVGElement,
  filename: string,
  type: 'image/png' | 'image/jpeg',
  size = 1024,
): void {
  const url = URL.createObjectURL(new Blob([svgMarkup(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }
    if (type === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size, size);
    }
    context.drawImage(image, 0, 0, size, size);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (blob) downloadFile(blob, {}, filename);
    }, type);
  };
  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}
