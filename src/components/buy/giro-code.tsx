import QRCode from 'react-qr-code';
import { PaymentInformation } from './payment-information';

interface GiroCodeProps {
  info: PaymentInformation;
}

export function GiroCode({ info }: GiroCodeProps): JSX.Element {
  function isValid(): boolean {
    return Boolean(info.giroCode);
  }

  return isValid() ? (
    <div className="flex flex-col items-center py-4 gap-1">
      <QRCode className="mx-auto" value={info.giroCode ?? ''} size={128} fgColor={'#072440'} />
      <p className="text-dfxBlue-800 font-semibold text-base">GiroCode</p>
    </div>
  ) : (
    <></>
  );
}
