import { useApi, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, SpinnerVariant, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { RiExternalLinkFill } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import { useSettingsContext } from 'src/contexts/settings.context';

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
  const { user } = useUserContext();
  const { translate } = useSettingsContext();
  const [showRequiredKyc, setShowRequiredKyc] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleOnClick = async (): Promise<void> => {
    if (!user?.kyc.dataComplete) {
      console.log('Requires KYC');
      setShowRequiredKyc(true);
      return;
    }
    try {
      setIsLoading(true);
      const response = await call<any>({ url: `buy/paymentInfos/${txId}/invoice`, method: 'PUT' }); // TODO: Add function to packages buy.hook.ts
      const pdfDataUri = `data:application/pdf;base64,${response.invoidePdf}`;
      const blob = await fetch(pdfDataUri).then((res) => res.blob());
      const url = URL.createObjectURL(blob);
      const pdfWindow = window.open(url, '_blank');
      if (pdfWindow) pdfWindow.focus();
      setIsLoading(false);
    } catch (err) {
      console.error(`Error displaying PDF: ${err}`);
    }
  };

  return stringIsSVG(value) ? (
    <div className="flex flex-col items-center py-4 gap-1.5">
      <img className="mx-auto" src={`data:image/svg+xml;utf8,${encodeURIComponent(value)}`} />
      <p className="text-dfxBlue-800 font-semibold text-base">Swiss QR-bill</p>
      {txId && (
        <button
          type="button"
          onClick={handleOnClick}
          disabled={showRequiredKyc}
          className="flex flex-row rounded-md px-2.5 py-1.5 items-center gap-1 text-dfxBlue-800 font-semibold text-sm cursor-pointer bg-dfxGray-400 hover:bg-dfxGray-500 disabled:bg-dfxGray-400 disabled:cursor-default disabled:text-dfxGray-600 disabled:hover:bg-dfxGray-400"
        >
          {isLoading ? (
            <div className="flex flex-row gap-2">
              <StyledLoadingSpinner variant={SpinnerVariant.LIGHT_MODE} size={SpinnerSize.MD} />
              {translate('screens/buy', 'Loading')}...
            </div>
          ) : (
            <>
              {translate('screens/buy', 'PDF Invoice')}
              <RiExternalLinkFill className="text-base" />
            </>
          )}
        </button>
      )}
      {showRequiredKyc && (
        <p className="text-dfxRed-150 text-sm">{translate('screens/buy', 'Requires KYC completion.')}</p>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center py-4 gap-1">
      <QRCode className="mx-auto" value={value} size={174} fgColor={'#072440'} />
      <p className="text-dfxBlue-800 font-semibold text-base">GiroCode</p>
    </div>
  );
}
