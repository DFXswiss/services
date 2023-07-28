import { Buy } from '@dfx.swiss/react';
import QRCode from 'react-qr-code';

interface GiroCodeProps {
  info: Buy;
}

export function GiroCode({ info }: GiroCodeProps): JSX.Element {
  const defaultValues = {
    service: 'BCD',
    version: '001',
    encoding: '2',
    transfer: 'SCT',
    char: '',
    ref: '',
  };

  function isValid(): boolean {
    return Boolean(info.currency) && Boolean(info.amount);
  }

  function toValue(info: Buy): string {
    if (!isValid()) return '';

    return `
${defaultValues.service}
${defaultValues.version}
${defaultValues.encoding}
${defaultValues.transfer}
${info.bic}
${info.name}, ${info.street} ${info.number}, ${info.zip} ${info.city}, ${info.country}
${info.iban}
${info.currency.name}${info.amount}
${defaultValues.char}
${defaultValues.ref}
${info.remittanceInfo}
    `.trim();
  }

  return isValid() ? (
    <div className="flex flex-col items-center py-4 gap-1">
      <QRCode className="mx-auto" value={toValue(info)} size={128} fgColor={'#072440'} />
      <p className="text-dfxBlue-800 font-semibold text-base">GiroCode</p>
    </div>
  ) : (
    <></>
  );
}
