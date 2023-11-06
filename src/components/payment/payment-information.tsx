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
            'Please transfer the purchase amount using this information via your banking application. The purpose of payment is important!',
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
          label={translate('screens/payment', 'Purpose of payment')}
          infoText={translate(
            'screens/buy',
            'The purpose of payment remains identical for the selected asset and can be used for recurring payments and standing orders',
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

      <StyledDataTable label={translate('screens/buy', 'Recipient')} showBorder minWidth={false}>
        <StyledDataTableRow>{`${info.name}, ${info.street} ${info.number}, ${info.zip} ${info.city}, ${info.country}`}</StyledDataTableRow>
      </StyledDataTable>
    </>
  );
}
