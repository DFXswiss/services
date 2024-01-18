import { Buy } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  DfxIcon,
  IconColor,
  IconVariant,
  StyledDataTable,
  StyledDataTableRow,
  StyledInfoText,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';
import { useClipboard } from '../../hooks/clipboard.hook';
import { GiroCode } from './giro-code';

interface PaymentInformationContentProps {
  info: Buy;
}

export function PaymentInformationContent({ info }: PaymentInformationContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { copy } = useClipboard();
  return (
    <>
      <StyledVerticalStack marginY={5} gap={2}>
        <h2 className="text-dfxBlue-800 text-center">{translate('screens/payment', 'Payment Information')}</h2>
        <StyledInfoText iconColor={IconColor.BLUE}>
          {translate(
            'screens/buy',
            'Please transfer the purchase amount using this information via your banking application. The reference is important!',
          )}
        </StyledInfoText>
      </StyledVerticalStack>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/payment', 'IBAN')}>
          <div>
            <p>{info.iban}</p>
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
        <StyledDataTableRow
          label={translate('screens/payment', 'Reference')}
          infoText={translate(
            'screens/buy',
            'The reference remains identical for the selected asset and can be used for recurring payments and standing orders',
          )}
        >
          {info.remittanceInfo}
          <CopyButton onCopy={() => copy(info.remittanceInfo)} />
        </StyledDataTableRow>
      </StyledDataTable>

      {info.paymentRequest && (
        <div className="mt-4">
          <GiroCode value={info.paymentRequest} />
        </div>
      )}

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
    </>
  );
}
