import { Buy, Utils } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  DfxIcon,
  IconColor,
  IconVariant,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledTabContainer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';
import { useClipboard } from '../../hooks/clipboard.hook';
import { PaymentQrCode } from './payment-qr-code';

interface PaymentInformationContentProps {
  info: Buy;
}

export function PaymentInformationContent({ info }: PaymentInformationContentProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <StyledVerticalStack gap={3}>
        <h2 className="text-dfxBlue-800 text-center">{translate('screens/payment', 'Payment Information')}</h2>

        <StyledInfoText iconColor={IconColor.BLUE}>
          {info.remittanceInfo
            ? translate(
                'screens/buy',
                'Please transfer the purchase amount using this information via your banking application. The remittance info is important!',
              )
            : translate(
                'screens/buy',
                'Please transfer the purchase amount using this information via your banking application. This IBAN is unique to this asset, no remittance info is required.',
              )}
        </StyledInfoText>

        {info.paymentRequest ? (
          <StyledTabContainer
            tabs={[
              { title: translate('screens/payment', 'Text'), content: <PaymentInformationText info={info} /> },
              {
                title: translate('screens/payment', 'QR Code'),
                content: <PaymentQrCode value={info.paymentRequest} txId={info.id} />,
              },
            ]}
            darkTheme
            spread
            small
          />
        ) : (
          <PaymentInformationText info={info} />
        )}
      </StyledVerticalStack>
    </>
  );
}

function PaymentInformationText({ info }: PaymentInformationContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { copy } = useClipboard();

  return (
    <>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow
          label={translate('screens/payment', 'Amount in {{currency}}', { currency: info.currency.name })}
        >
          {info.amount}
          <CopyButton onCopy={() => copy(`${info.amount}`)} />
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'IBAN')}>
          <div>
            <p>{Utils.formatIban(info.iban)}</p>
            {info.sepaInstant && (
              <div className="text-white">
                <DfxIcon icon={IconVariant.SEPA_INSTANT} color={IconColor.RED} />
              </div>
            )}
          </div>
          <CopyButton onCopy={() => copy(info.iban)} />
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/payment', 'BIC')}>
          {info.bic}
          <CopyButton onCopy={() => copy(info.bic)} />
        </StyledDataTableRow>
        {info.remittanceInfo && (
          <StyledDataTableRow
            label={translate('screens/payment', 'Remittance info')}
            infoText={translate(
              'screens/buy',
              'The remittance info remains identical for the selected asset and can be used for recurring payments and standing orders',
            )}
          >
            {info.remittanceInfo}
            <CopyButton onCopy={() => copy(info.remittanceInfo)} />
          </StyledDataTableRow>
        )}
      </StyledDataTable>

      <div className="mt-3">
        <StyledDataTable
          label={translate('screens/payment', 'Recipient')}
          alignContent={AlignContent.RIGHT}
          showBorder
          minWidth={false}
        >
          <StyledDataTableRow label={translate('screens/buy', 'Name')}>
            {info.name}
            <CopyButton onCopy={() => copy(`${info.name}`)} />
          </StyledDataTableRow>
          <StyledDataTableRow label={translate('screens/buy', 'Address')}>
            {`${info.street} ${info.number}`}
            <CopyButton onCopy={() => copy(`${info.street} ${info.number}`)} />
          </StyledDataTableRow>
          <StyledDataTableRow label={translate('screens/kyc', 'ZIP code')}>
            {info.zip}
            <CopyButton onCopy={() => copy(`${info.zip}`)} />
          </StyledDataTableRow>
          <StyledDataTableRow label={translate('screens/kyc', 'City')}>
            {info.city}
            <CopyButton onCopy={() => copy(`${info.city}`)} />
          </StyledDataTableRow>
          <StyledDataTableRow label={translate('screens/kyc', 'Country')}>
            {info.country}
            <CopyButton onCopy={() => copy(`${info.country}`)} />
          </StyledDataTableRow>
        </StyledDataTable>
      </div>
    </>
  );
}
