import { useRef } from 'react';
import QRCode from 'react-qr-code';
import { downloadQrRaster, downloadQrSvg, promoQrFilename } from 'src/util/promo-landing-url';

interface PromoQrDialogProps {
  code: string;
  url: string;
  translate: (ns: string, key: string) => string;
  onClose: () => void;
}

export function PromoQrDialog({ code, url, translate, onClose }: PromoQrDialogProps): JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);

  function svg(): SVGSVGElement | undefined {
    return frameRef.current?.querySelector('svg') ?? undefined;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="promo-qr-title"
        className="bg-white rounded-lg shadow-lg p-4 flex flex-col gap-3 max-w-sm w-full text-left"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="promo-qr-title" className="text-dfxGray-700 font-semibold">
          {translate('screens/referral', 'QR code')} — {code}
        </h3>
        <div ref={frameRef} className="bg-white p-3 flex justify-center" data-testid="promo-qr">
          <QRCode value={url} size={192} />
        </div>
        <a
          className="text-sm text-dfxBlue-800 underline break-all"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {url}
        </a>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-sm text-dfxBlue-800 underline"
            onClick={() => {
              const image = svg();
              if (image) downloadQrSvg(image, promoQrFilename(code, 'svg'));
            }}
          >
            {translate('screens/referral', 'Download SVG')}
          </button>
          <button
            type="button"
            className="text-sm text-dfxBlue-800 underline"
            onClick={() => {
              const image = svg();
              if (image) downloadQrRaster(image, promoQrFilename(code, 'png'), 'image/png');
            }}
          >
            {translate('screens/referral', 'Download PNG')}
          </button>
          <button
            type="button"
            className="text-sm text-dfxBlue-800 underline"
            onClick={() => {
              const image = svg();
              if (image) downloadQrRaster(image, promoQrFilename(code, 'jpg'), 'image/jpeg');
            }}
          >
            {translate('screens/referral', 'Download JPG')}
          </button>
        </div>
        <button type="button" className="text-sm text-dfxGray-700 underline self-start" onClick={onClose}>
          {translate('general/actions', 'Close')}
        </button>
      </div>
    </div>
  );
}
