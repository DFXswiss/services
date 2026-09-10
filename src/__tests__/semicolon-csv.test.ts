import { downloadCsv, escapeSemicolonCsvCell, toSemicolonCsv } from 'src/util/semicolon-csv';

describe('semicolon-csv', () => {
  describe('escapeSemicolonCsvCell', () => {
    it('leaves plain values unchanged', () => {
      expect(escapeSemicolonCsvCell('plain')).toBe('plain');
      expect(escapeSemicolonCsvCell('123')).toBe('123');
    });

    it('wraps and doubles quotes when the value contains a semicolon, quote, CR or LF', () => {
      expect(escapeSemicolonCsvCell('a;b')).toBe('"a;b"');
      expect(escapeSemicolonCsvCell('say "hi"')).toBe('"say ""hi"""');
      expect(escapeSemicolonCsvCell('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeSemicolonCsvCell('line1\rline2')).toBe('"line1\rline2"');
    });
  });

  describe('toSemicolonCsv', () => {
    it('joins headers and rows with semicolons and does not add a BOM', () => {
      const csv = toSemicolonCsv(['A', 'B'], [
        ['x', 1],
        ['y', 2],
      ]);
      expect(csv).toBe('A;B\nx;1\ny;2');
      expect(csv.startsWith('\uFEFF')).toBe(false);
    });

    it('turns undefined and null into empty cells', () => {
      expect(toSemicolonCsv(['A', 'B', 'C'], [[undefined, null, 'z']])).toBe('A;B;C\n;;z');
    });

    it('escapes cells that need quoting', () => {
      expect(toSemicolonCsv(['H'], [['a;b']])).toBe('H\n"a;b"');
    });
  });

  describe('downloadCsv', () => {
    const created: HTMLAnchorElement[] = [];
    let createElementSpy: jest.SpyInstance;
    let createObjectURL: jest.Mock;
    let revokeObjectURL: jest.Mock;

    beforeEach(() => {
      created.length = 0;
      const orig = document.createElement.bind(document);
      createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = orig(tag);
        if (tag === 'a') {
          created.push(el as HTMLAnchorElement);
          jest.spyOn(el, 'click').mockImplementation(() => undefined);
        }
        return el;
      });
      createObjectURL = jest.fn(() => 'blob:csv');
      revokeObjectURL = jest.fn();
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        writable: true,
        value: createObjectURL,
      });
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        writable: true,
        value: revokeObjectURL,
      });
    });

    afterEach(() => {
      createElementSpy.mockRestore();
    });

    it('prepends a BOM, downloads as utf-8 csv, and revokes the object URL', () => {
      const body = toSemicolonCsv(['A'], [['1']]);
      expect(body.startsWith('\uFEFF')).toBe(false);

      const BlobOrig = global.Blob;
      let blobParts: BlobPart[] | undefined;
      let blobOptions: BlobPropertyBag | undefined;
      global.Blob = class extends BlobOrig {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          blobParts = parts;
          blobOptions = options;
          super(parts, options);
        }
      } as typeof Blob;

      try {
        downloadCsv('out.csv', body);
      } finally {
        global.Blob = BlobOrig;
      }

      expect(blobParts).toEqual([`\uFEFF${body}`]);
      expect(blobOptions?.type).toBe('text/csv;charset=utf-8');
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(created).toHaveLength(1);
      expect(created[0].download).toBe('out.csv');
      expect(created[0].href).toContain('blob:csv');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    });
  });
});
