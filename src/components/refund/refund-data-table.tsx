import { Utils } from '@dfx.swiss/react';
import { AlignContent, StyledDataTable, StyledDataTableRow } from '@dfx.swiss/react-components';
import { useSettingsContext } from 'src/contexts/settings.context';
import { TransactionRefundData } from 'src/hooks/compliance.hook';

interface RefundDataTableProps {
  readonly refundData: TransactionRefundData;
}

export function RefundDataTable({ refundData }: RefundDataTableProps): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
      <StyledDataTableRow label={translate('screens/payment', 'Transaction amount')}>
        <p>
          {refundData.inputAmount} {refundData.inputAsset?.name}
        </p>
      </StyledDataTableRow>
      <StyledDataTableRow label={translate('screens/payment', 'DFX fee')}>
        <p>
          {refundData.fee.dfx} {refundData.refundAsset?.name}
        </p>
      </StyledDataTableRow>
      <StyledDataTableRow label={translate('screens/payment', 'Bank fee')}>
        <p>
          {refundData.fee.bank} {refundData.refundAsset?.name}
        </p>
      </StyledDataTableRow>
      <StyledDataTableRow label={translate('screens/payment', 'Network fee')}>
        <p>
          {refundData.fee.network} {refundData.refundAsset?.name}
        </p>
      </StyledDataTableRow>
      <StyledDataTableRow
        label={translate('screens/payment', 'Refund amount')}
        infoText={translate('screens/payment', 'Refund amount is the transaction amount minus the fee.')}
      >
        <p>
          {refundData.refundAmount} {refundData.refundAsset?.name}
        </p>
      </StyledDataTableRow>
      {refundData.bankDetails?.name && (
        <StyledDataTableRow label={translate('screens/payment', 'Name')}>
          <p>{refundData.bankDetails.name}</p>
        </StyledDataTableRow>
      )}
      {(refundData.bankDetails?.address || refundData.bankDetails?.houseNumber) && (
        <StyledDataTableRow label={translate('screens/payment', 'Address')}>
          <p>{[refundData.bankDetails.address, refundData.bankDetails.houseNumber].filter(Boolean).join(' ')}</p>
        </StyledDataTableRow>
      )}
      {(refundData.bankDetails?.zip || refundData.bankDetails?.city) && (
        <StyledDataTableRow label={translate('screens/payment', 'City')}>
          <p>{[refundData.bankDetails.zip, refundData.bankDetails.city].filter(Boolean).join(' ')}</p>
        </StyledDataTableRow>
      )}
      {refundData.bankDetails?.country && (
        <StyledDataTableRow label={translate('screens/payment', 'Country')}>
          <p>{refundData.bankDetails.country}</p>
        </StyledDataTableRow>
      )}
      {refundData.bankDetails?.iban && (
        <StyledDataTableRow label={translate('screens/payment', 'IBAN')}>
          <p>{Utils.formatIban(refundData.bankDetails.iban) ?? refundData.bankDetails.iban}</p>
        </StyledDataTableRow>
      )}
      {refundData.bankDetails?.bic && (
        <StyledDataTableRow label={translate('screens/payment', 'BIC')}>
          <p>{refundData.bankDetails.bic}</p>
        </StyledDataTableRow>
      )}
    </StyledDataTable>
  );
}
