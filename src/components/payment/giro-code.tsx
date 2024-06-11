import { useApi } from '@dfx.swiss/react';
import { RiExternalLinkFill } from 'react-icons/ri';
import QRCode from 'react-qr-code';

interface GiroCodeProps {
  value: string;
  txId?: number;
}

function stringIsSVG(value: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'image/svg+xml');
  const svgElement = doc.getElementsByTagName('svg')[0];
  return svgElement !== undefined && svgElement.nodeName === 'svg';
}

export function GiroCode({ value, txId }: GiroCodeProps): JSX.Element {
  const { call } = useApi();

  const handleOnClick = async (txId?: number): Promise<void> => {
    if (!txId) return;
    try {
      const response = await call<any>({ url: `buy/paymentInfos/${txId}/invoice`, method: 'PUT' }); // TODO: Add function to packages buy.hook.ts
      const pdfDataUri = `data:application/pdf;base64,${response.base64Enc}`;
      const blob = await fetch(pdfDataUri).then((res) => res.blob());
      const url = URL.createObjectURL(blob);
      const pdfWindow = window.open(url, '_blank');
      if (pdfWindow) pdfWindow.focus();
    } catch (err) {
      throw new Error(`Error displaying PDF: ${err}`);
    }
  };

  if (stringIsSVG(value)) {
    return (
      <div className="flex flex-col items-center py-4 gap-1">
        <img className="mx-auto" src={`data:image/svg+xml;utf8,${encodeURIComponent(value)}`} />
        <p className="text-dfxBlue-800 font-semibold text-base">Swiss QR-Bill</p>
        <button
          type="button"
          onClick={() => handleOnClick(txId)}
          className="flex flex-row items-center gap-1 text-dfxBlue-800 font-semibold text-base underline cursor-pointer hover:text-dfxBlue-300"
        >
          PDF Invoice
          <RiExternalLinkFill className="text-lg" />
        </button>
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center py-4 gap-1">
        <QRCode className="mx-auto" value={value} size={174} fgColor={'#072440'} />
        <p className="text-dfxBlue-800 font-semibold text-base">GiroCode</p>
      </div>
    );
  }
}
