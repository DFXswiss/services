import { useBuy, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, SpinnerVariant, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { RiExternalLinkFill } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from 'src/hooks/navigation.hook';
import { openPdfFromString } from 'src/util/utils';

interface GiroCodeProps {
  value: string;
  txId: number;
}

function stringIsSVG(value: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'image/svg+xml');
  const svgElement = doc.getElementsByTagName('svg')[0];
  return svgElement !== undefined && svgElement.nodeName === 'svg';
}

export function PaymentQrCode({ value, txId }: GiroCodeProps): JSX.Element {
  const { invoiceFor } = useBuy();
  const { user } = useUserContext();
  const { navigate } = useNavigation();
  const { translate } = useSettingsContext();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function onInvoiceClick(): Promise<void> {
    if (!user?.kyc.dataComplete) {
      navigate('/profile', { setRedirect: true });
      return;
    }
    try {
      setIsLoading(true);
      const response = await invoiceFor(txId);
      openPdfFromString(response.invoicePdf);
    } catch (err) {
      console.error(`Error displaying PDF: ${err}`);
    } finally {
      setIsLoading(false);
    }
  }

  return stringIsSVG(value) ? (
    <div className="flex flex-col items-center py-4 gap-1.5">
      <img
        className="mx-auto h-auto w-full max-w-[15rem]"
        src={`data:image/svg+xml;utf8,${encodeURIComponent(value)}`}
      />
      <p className="text-dfxBlue-800 font-semibold text-base">{translate('screens/buy', 'QR-bill')}</p>
      <button
        type="button"
        onClick={onInvoiceClick}
        disabled={isLoading}
        className="flex flex-row rounded-md px-2.5 py-1.5 items-center gap-1.5 text-dfxBlue-800 font-semibold text-sm cursor-pointer bg-dfxGray-400 hover:bg-dfxGray-500 disabled:bg-dfxGray-400 disabled:cursor-default disabled:text-dfxGray-600 disabled:hover:bg-dfxGray-400"
      >
        <>
          {isLoading && <StyledLoadingSpinner variant={SpinnerVariant.LIGHT_MODE} size={SpinnerSize.MD} />}
          {translate('screens/buy', 'PDF Invoice')}
          <RiExternalLinkFill className="-ml-0.5 text-base" />
        </>
      </button>
    </div>
  ) : (
    <div className="flex flex-col items-center py-4 gap-1">
      <QRCode className="mx-auto h-auto w-full max-w-[15rem]" value={value} fgColor={'#072440'} />
      <p className="text-dfxBlue-800 font-semibold text-base">GiroCode</p>
    </div>
  );
}
