import { Buy } from '@dfx.swiss/react';
import { useEffect, useRef } from 'react';
import { SwissQRCode } from 'swissqrbill/svg';
import { Data as QrBillData } from 'swissqrbill/types';

interface SwissQRBillProps {
  info: Buy;
}

export function isValidSwissQRBill(info: Buy): boolean {
  return info.iban !== undefined && ["CHF", "EUR"].includes(info.currency.name);
}

export function buyDataToQrBillData(info: Buy): QrBillData | undefined {
  if (!isValidSwissQRBill(info)) return undefined;

  return {
    amount: info.amount,
    creditor: {
      account: info.iban,
      address: info.street,
      buildingNumber: info.number,
      city: info.city,
      country: {"Schweiz": "CH"}[info.country],
      name: info.name,
      zip: info.zip,
    },
    currency: info.currency.name,
    reference: info.remittanceInfo,
  } as QrBillData
}

export function SwissQRBill({ info }: SwissQRBillProps): JSX.Element {
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const data = buyDataToQrBillData(info);
    const svg = data && new SwissQRCode(data);
    console.log('svg', svg);
    if (svgContainerRef.current && svg) {
      svgContainerRef.current.innerHTML = '';
      svgContainerRef.current.appendChild(svg.element);
    }

    return () => {
      if (svgContainerRef.current) svgContainerRef.current.innerHTML = '';
    };
  }, [info]);

  return (
    <div className="flex flex-col items-center py-4 gap-1">
      <div className="mx-auto" ref={svgContainerRef}></div>
      <p className="text-dfxBlue-800 font-semibold text-base">Swiss QR-Bill</p>
    </div>
  );
}
