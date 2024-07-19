import { Sell, Swap, Utils } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  IconColor,
  IconSize,
  IconVariant,
  StyledDataTable,
  StyledDataTableRow,
  StyledHorizontalStack,
  StyledIconButton,
  StyledInfoText,
  StyledTabContainer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';
import { useClipboard } from 'src/hooks/clipboard.hook';
import { useTxHelper } from 'src/hooks/tx-helper.hook';
import { blankedAddress } from 'src/util/utils';
import { QrCopy } from './qr-copy';

interface PaymentInformationContentProps {
  info: Sell | Swap;
  infoText?: string;
  showAmount?: boolean;
}

export function PaymentInformationContent({ info, infoText, showAmount }: PaymentInformationContentProps): JSX.Element {
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
              content: <PaymentInformationText paymentInfo={info} infoText={infoText} showAmount={showAmount} />,
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
        <PaymentInformationText paymentInfo={info} infoText={infoText} showAmount={showAmount} />
      )}
    </StyledVerticalStack>
  );
}

function PaymentInformationText({
  paymentInfo,
  infoText,
  showAmount,
}: {
  paymentInfo: Sell | Swap;
  infoText?: string;
  showAmount?: boolean;
}): JSX.Element {
  const { copy } = useClipboard();
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();
  const { width } = useWindowContext();
  const [showContract, setShowContract] = useState(false);

  const asset = 'asset' in paymentInfo ? paymentInfo.asset : paymentInfo.sourceAsset;

  return (
    <StyledVerticalStack gap={2} full>
      <div className="text-left">
        <StyledInfoText iconColor={IconColor.BLUE}>{infoText}</StyledInfoText>
      </div>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        {showAmount && (
          <>
            <StyledDataTableRow label={translate('screens/sell', 'Amount')}>
              <p>{Utils.formatAmountCrypto(paymentInfo.amount)}</p>
              <CopyButton onCopy={() => copy(paymentInfo.amount.toString())} />
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/sell', 'Asset')}>
              {showContract && asset.chainId ? (
                <StyledHorizontalStack gap={2}>
                  <span>{blankedAddress(asset.chainId, { width })}</span>
                  <StyledIconButton icon={IconVariant.COPY} onClick={() => copy(asset.chainId)} size={IconSize.SM} />
                  {asset.explorerUrl && (
                    <StyledIconButton
                      icon={IconVariant.OPEN_IN_NEW}
                      onClick={() => window.open(asset.explorerUrl, '_blank')}
                      size={IconSize.SM}
                    />
                  )}
                </StyledHorizontalStack>
              ) : (
                <p>{asset.name}</p>
              )}
              {asset.chainId && (
                <StyledIconButton
                  icon={showContract ? IconVariant.INFO : IconVariant.INFO_OUTLINE}
                  color={IconColor.DARK_GRAY}
                  onClick={() => setShowContract(!showContract)}
                />
              )}
            </StyledDataTableRow>
          </>
        )}
        <StyledDataTableRow label={translate('screens/sell', 'Address')}>
          <div>
            <p>{blankedAddress(paymentInfo.depositAddress, { width })}</p>
          </div>
          <CopyButton onCopy={() => copy(paymentInfo.depositAddress)} />
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/sell', 'Blockchain')}>
          <div>
            <p>{toString(asset.blockchain)}</p>
          </div>
        </StyledDataTableRow>
      </StyledDataTable>
    </StyledVerticalStack>
  );
}
