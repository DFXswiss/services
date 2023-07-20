import { Buy, Fiat } from '@dfx.swiss/react';
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

export interface PaymentInformation {
  buy: Buy;
  recipient: string;
  estimatedAmount: string;
  fee: string;
  minFee?: string;
  currency?: Fiat;
  amount: number;
  giroCode?: string;
}

interface PaymentInformationContentProps {
  info: PaymentInformation;
}

export function PaymentInformationContent({ info }: PaymentInformationContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { copy } = useClipboard();
  return (
    <>
      <StyledVerticalStack marginY={5} gap={2}>
        <h2 className="text-dfxBlue-800 text-center">{translate('screens/buy', 'Payment Information')}</h2>
        <StyledInfoText iconColor={IconColor.BLUE}>
          {translate(
            'screens/buy',
            'Please transfer the purchase amount using this information via your banking application. The purpose of payment is important!',
          )}
        </StyledInfoText>
      </StyledVerticalStack>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/buy', 'IBAN')}>
          <div>
            <p>{info.buy.iban}</p>
            {info.buy.sepaInstant && (
              <div className="text-white">
                <DfxIcon icon={IconVariant.SEPA_INSTANT} color={IconColor.RED} />
              </div>
            )}
          </div>
          <CopyButton onCopy={() => copy(info.buy.iban)} />
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/buy', 'BIC')}>
          {info.buy.bic}
          <CopyButton onCopy={() => copy(info.buy.bic)} />
        </StyledDataTableRow>
        <StyledDataTableRow
          label={translate('screens/buy', 'Purpose of payment')}
          infoText={translate(
            'screens/buy',
            'The purpose of payment remains identical for the selected asset and can be used for recurring payments and standing orders',
          )}
        >
          {info.buy.remittanceInfo}
          <CopyButton onCopy={() => copy(info.buy.remittanceInfo)} />
        </StyledDataTableRow>
      </StyledDataTable>
      <GiroCode info={info} />
      <StyledDataTable label={translate('screens/buy', 'Recipient')} showBorder minWidth={false}>
        <StyledDataTableRow>{info.recipient}</StyledDataTableRow>
      </StyledDataTable>
    </>
  );
}
