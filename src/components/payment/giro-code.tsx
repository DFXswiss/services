import QRCode from 'react-qr-code';

interface GiroCodeProps {
  value: string;
}

export function GiroCode({ value }: GiroCodeProps): JSX.Element {
  return (
    <div className="flex flex-col items-center py-4 gap-1">
      <QRCode className="mx-auto" value={value} size={174} fgColor={'#072440'} />
      <p className="text-dfxBlue-800 font-semibold text-base">GiroCode</p>
    </div>
  );
}
