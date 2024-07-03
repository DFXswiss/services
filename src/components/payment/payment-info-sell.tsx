import { Sell, Swap } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  IconColor,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledTabContainer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useClipboard } from 'src/hooks/clipboard.hook';
import { useTxHelper } from 'src/hooks/tx-helper.hook';
import { blankedAddress } from 'src/util/utils';
import { QrCopy } from './qr-copy';

interface PaymentInformationContentProps {
  info: Sell | Swap;
  infoText?: string;
}

export function PaymentInformationContent({ info, infoText }: PaymentInformationContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { canSendTransaction } = useTxHelper();

  return (
    <StyledVerticalStack gap={3} full>
      <h2 className="text-dfxBlue-800 text-center">{translate('screens/payment', 'Payment Information')}</h2>

      {info.paymentRequest && !canSendTransaction() ? (
        <StyledTabContainer
          tabs={[
            {
              title: translate('screens/payment', 'Text'),
              content: <PaymentInformationText paymentInfo={info} infoText={infoText} />,
            },
            {
              title: translate('screens/payment', 'QR Code'),
              content: (
                <StyledVerticalStack full center>
                  <p className="font-semibold text-sm text-dfxBlue-800">
                    {translate('screens/sell', 'Pay with your wallet')}
                  </p>
                  <QrCopy data={info.paymentRequest} />
                </StyledVerticalStack>
              ),
            },
          ]}
          darkTheme
          spread
          small
        />
      ) : (
        <PaymentInformationText paymentInfo={info} infoText={infoText} />
      )}
    </StyledVerticalStack>
  );
}

function PaymentInformationText({
  paymentInfo,
  infoText,
}: {
  paymentInfo: Sell | Swap;
  infoText?: string;
}): JSX.Element {
  const { copy } = useClipboard();
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();

  const chain = 'asset' in paymentInfo ? paymentInfo.asset.blockchain : paymentInfo.sourceAsset.blockchain;

  return (
    <StyledVerticalStack gap={2} full>
      <div className="text-left">
        <StyledInfoText iconColor={IconColor.BLUE}>{infoText}</StyledInfoText>
      </div>

      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/sell', 'Address')}>
          <div>
            <p>{blankedAddress(paymentInfo.depositAddress, { dynamicLength: true })}</p>
          </div>
          <CopyButton onCopy={() => copy(paymentInfo.depositAddress)} />
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/sell', 'Blockchain')}>
          <div>
            <p>{toString(chain)}</p>
          </div>
        </StyledDataTableRow>
      </StyledDataTable>
    </StyledVerticalStack>
  );
}
