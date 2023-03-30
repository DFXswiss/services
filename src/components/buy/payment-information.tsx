import { Fiat } from '../../api/definitions/fiat';
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
  fee: string;
  currency?: Fiat;
  amount?: number;
  giroCode?: string;
}

interface PaymentInformationContentProps {
  info: PaymentInformation;
}

export function PaymentInformationContent({ info }: PaymentInformationContentProps): JSX.Element {
  const { copy } = useClipboard();
  return (
    <>
      <StyledVerticalStack marginY={5} gap={2}>
        <h2 className="text-center">Payment Information</h2>
        <StyledInfoText iconColor={IconColors.BLUE}>
          Please transfer the purchase amount using this information via your banking application. The purpose of
          payment is important!
        </StyledInfoText>
      </StyledVerticalStack>
      <StyledDataTable alignContent={AlignContent.RIGHT} showBorder>
        <StyledDataTableRow label="IBAN">
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
        <StyledDataTableRow label="BIC">
          {info.bic}
          <CopyButton onCopy={() => copy(info.bic)} />
        </StyledDataTableRow>
        <StyledDataTableRow
          label="Purpose of payment"
          infoText="The purpose of payment remains identical for the selected asset and can be used for recurring payments and standing orders."
        >
          {info.purpose}
          <CopyButton onCopy={() => copy(info.purpose)} />
        </StyledDataTableRow>
      </StyledDataTable>
      <GiroCode info={info} />
      <StyledDataTable label="Recipient" showBorder>
        <StyledDataTableRow>{info.recipient}</StyledDataTableRow>
      </StyledDataTable>
      <StyledDataTable alignContent={AlignContent.BETWEEN} showBorder={false} narrow>
        <StyledDataTableRow discreet>
          <p>DFX-Fee</p>
          <p>{info.fee}</p>
        </StyledDataTableRow>
      </StyledDataTable>
    </>
  );
}
