import {
  downloadBlob,
  downloadQrSvg,
  promoLandingUrl,
  promoQrFilename,
  svgMarkup,
} from 'src/util/promo-landing-url';

describe('promoLandingUrl', () => {
  it('puts the promo code on the realunit.app landing path', () => {
    expect(promoLandingUrl('XYZ')).toBe('https://realunit.app/promo/XYZ');
  });

  it('encodes characters that are not safe in a path segment', () => {
    expect(promoLandingUrl('VOW 2026')).toBe('https://realunit.app/promo/VOW%202026');
  });
});

describe('promoQrFilename', () => {
  it('keeps a simple campaign token', () => {
    expect(promoQrFilename('XYZ', 'png')).toBe('realunit-promo-XYZ.png');
  });

  it('strips characters that are not a filename', () => {
    expect(promoQrFilename('VOW 2026/x', 'jpg')).toBe('realunit-promo-VOW_2026_x.jpg');
  });
});

describe('downloadQrSvg', () => {
  it('downloads the SVG markup under the given filename', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 10 10');
    const createObjectURL = jest.fn(() => 'blob:qr');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = jest.fn();
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: click });
      }
      return el;
    });

    downloadQrSvg(svg, 'realunit-promo-XYZ.svg');

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr');
    expect(svgMarkup(svg)).toContain('viewBox="0 0 10 10"');
    jest.restoreAllMocks();
  });
});

describe('downloadBlob', () => {
  it('creates a temporary download anchor', () => {
    const createObjectURL = jest.fn(() => 'blob:file');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = jest.fn();
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') Object.defineProperty(el, 'click', { value: click });
      return el;
    });

    downloadBlob(new Blob(['x'], { type: 'text/plain' }), 'n.txt');

    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:file');
    jest.restoreAllMocks();
  });
});
