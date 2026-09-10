import {
  downloadQrRaster,
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

  it('falls back when the code has no filename-safe characters', () => {
    expect(promoQrFilename('///', 'svg')).toBe('realunit-promo-code.svg');
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

describe('downloadQrRaster', () => {
  const svg = () => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', '0 0 10 10');
    return node;
  };

  function mockUrl() {
    const createObjectURL = jest.fn(() => 'blob:qr');
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    return { createObjectURL, revokeObjectURL };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fills white then draws and downloads a JPEG', async () => {
    mockUrl();
    const fillRect = jest.fn();
    const drawImage = jest.fn();
    const click = jest.fn();
    const context = { fillStyle: '', fillRect, drawImage };
    let toBlobType: string | undefined;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, value: FakeImage });
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'canvas') {
        Object.defineProperty(el, 'getContext', {
          value: () => context,
        });
        Object.defineProperty(el, 'toBlob', {
          value: (cb: (blob: Blob | null) => void, type: string) => {
            toBlobType = type;
            cb(new Blob(['jpg'], { type }));
          },
        });
      }
      if (tag === 'a') Object.defineProperty(el, 'click', { value: click });
      return el;
    });

    downloadQrRaster(svg(), 'realunit-promo-XYZ.jpg', 'image/jpeg', 64);
    await Promise.resolve();
    await Promise.resolve();

    expect(context.fillStyle).toBe('#ffffff');
    expect(fillRect).toHaveBeenCalledWith(0, 0, 64, 64);
    expect(drawImage).toHaveBeenCalled();
    expect(toBlobType).toBe('image/jpeg');
    expect(click).toHaveBeenCalled();
  });

  it('downloads a PNG without a white fill', async () => {
    mockUrl();
    const fillRect = jest.fn();
    const click = jest.fn();
    let toBlobType: string | undefined;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, value: FakeImage });
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'canvas') {
        Object.defineProperty(el, 'getContext', {
          value: () => ({ fillStyle: '', fillRect, drawImage: jest.fn() }),
        });
        Object.defineProperty(el, 'toBlob', {
          value: (cb: (blob: Blob | null) => void, type: string) => {
            toBlobType = type;
            cb(new Blob(['png'], { type }));
          },
        });
      }
      if (tag === 'a') Object.defineProperty(el, 'click', { value: click });
      return el;
    });

    downloadQrRaster(svg(), 'realunit-promo-XYZ.png', 'image/png');
    await Promise.resolve();
    await Promise.resolve();

    expect(fillRect).not.toHaveBeenCalled();
    expect(toBlobType).toBe('image/png');
    expect(click).toHaveBeenCalled();
  });

  it('revokes the object URL when the canvas has no 2d context', async () => {
    const { revokeObjectURL } = mockUrl();
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, value: FakeImage });
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'canvas') {
        Object.defineProperty(el, 'getContext', { value: () => null });
      }
      return el;
    });

    downloadQrRaster(svg(), 'x.png', 'image/png');
    await Promise.resolve();
    await Promise.resolve();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr');
  });

  it('revokes the object URL when the image fails to load', () => {
    const { revokeObjectURL } = mockUrl();
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        this.onerror?.();
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, value: FakeImage });

    downloadQrRaster(svg(), 'x.png', 'image/png');

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr');
  });

  it('does not download when toBlob returns null', async () => {
    mockUrl();
    const click = jest.fn();
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(window, 'Image', { configurable: true, value: FakeImage });
    const originalCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'canvas') {
        Object.defineProperty(el, 'getContext', {
          value: () => ({ fillStyle: '', fillRect: jest.fn(), drawImage: jest.fn() }),
        });
        Object.defineProperty(el, 'toBlob', {
          value: (cb: (blob: Blob | null) => void) => cb(null),
        });
      }
      if (tag === 'a') Object.defineProperty(el, 'click', { value: click });
      return el;
    });

    downloadQrRaster(svg(), 'x.png', 'image/png');
    await Promise.resolve();
    await Promise.resolve();

    expect(click).not.toHaveBeenCalled();
  });
});
