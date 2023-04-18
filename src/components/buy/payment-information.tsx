import { Fiat } from '../../api/definitions/fiat';
import { useLanguageContext } from '../../contexts/language.context';
import { useClipboard } from '../../hooks/clipboard.hook';
import DfxIcon, { IconColors, IconVariant } from '../../stories/DfxIcon';
import StyledVerticalStack from '../../stories/layout-helpers/StyledVerticalStack';
import StyledDataTable, { AlignContent } from '../../stories/StyledDataTable';
import StyledDataTableRow from '../../stories/StyledDataTableRow';
import StyledInfoText from '../../stories/StyledInfoText';
import { CopyButton } from '../copy-button';
import { GiroCode } from './giro-code';

export interface PaymentInformation {
  iban: string;
  isSepaInstant: boolean;
  bic: string;
  purpose: string;
  recipient: string;
  estimatedAmount: string;
  fee: string;
  minFee?: string;
  currency?: Fiat;
  amount?: number;
  giroCode?: string;
}

interface PaymentInformationContentProps {
  info: PaymentInformation;
}

export function PaymentInformationContent({ info }: PaymentInformationContentProps): JSX.Element {
  const { translate } = useLanguageContext();
  const { copy } = useClipboard();
  return (
    <>
      <StyledVerticalStack marginY={5} gap={2}>
        <h2 className="text-dfxBlue-800 text-center">{translate('screens/buy/payment', 'Payment Information')}</h2>
        <StyledInfoText iconColor={IconColors.BLUE}>
          {translate(
            'screens/buy/payment',
            'Please transfer the purchase amount using this information via your banking application. The purpose of payment is important!',
          )}
        </StyledInfoText>
      </StyledVerticalStack>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
        <StyledDataTableRow label={translate('screens/buy/payment', 'IBAN')}>
          <div>
            <p>{info.iban}</p>
            {info.isSepaInstant && (
              <div className="text-white">
                <DfxIcon icon={IconVariant.SEPA_INSTANT} color={IconColors.RED} />
              </div>
            )}
          </div>
          <CopyButton onCopy={() => copy(info.iban)} />
        </StyledDataTableRow>
        <StyledDataTableRow label={translate('screens/buy/payment', 'BIC')}>
          {info.bic}
          <CopyButton onCopy={() => copy(info.bic)} />
        </StyledDataTableRow>
        <StyledDataTableRow
          label={translate('screens/buy/payment', 'Purpose of payment')}
          infoText={translate(
            'screens/buy/payment',
            'The purpose of payment remains identical for the selected asset and can be used for recurring payments and standing orders.',
          )}
        >
          {info.purpose}
          <CopyButton onCopy={() => copy(info.purpose)} />
        </StyledDataTableRow>
      </StyledDataTable>
      <GiroCode info={info} />
      <StyledDataTable label={translate('screens/buy/payment', 'Recipient')} showBorder minWidth={false}>
        <StyledDataTableRow>{info.recipient}</StyledDataTableRow>
      </StyledDataTable>
      <StyledDataTable alignContent={AlignContent.BETWEEN} showBorder={false} narrow minWidth={false}>
        <StyledDataTableRow discreet>
          <p>{translate('screens/buy/payment', 'DFX-Fee')}</p>
          <p>
            {info.minFee
              ? translate('screens/buy/payment', '{{fee}} (min. {{minFee}})', { fee: info.fee, minFee: info.minFee })
              : info.fee}
          </p>
        </StyledDataTableRow>
      </StyledDataTable>
    </>
  );
}
