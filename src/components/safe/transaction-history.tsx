import { Utils } from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconVariant,
  DfxAssetIcon,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustodyOrderHistory, CustodyOrderHistoryStatus, CustodyOrderType } from 'src/dto/order.dto';

interface TransactionHistoryProps {
  transactions: CustodyOrderHistory[];
  isLoading: boolean;
}

const ORDER_TYPE_LABELS: Record<CustodyOrderType, string> = {
  [CustodyOrderType.DEPOSIT]: 'Deposit (Fiat)',
  [CustodyOrderType.WITHDRAWAL]: 'Withdrawal (Fiat)',
  [CustodyOrderType.RECEIVE]: 'Deposit (Crypto)',
  [CustodyOrderType.SEND]: 'Withdrawal (Crypto)',
  [CustodyOrderType.SWAP]: 'Swap',
  [CustodyOrderType.EQUITY_MINT]: 'Mint',
  [CustodyOrderType.EQUITY_REDEEM]: 'Redeem',
  [CustodyOrderType.SAVING_DEPOSIT]: 'Deposit (Saving)',
  [CustodyOrderType.SAVING_WITHDRAWAL]: 'Withdrawal (Saving)',
};

const STATUS_LABELS: Record<CustodyOrderHistoryStatus, string> = {
  [CustodyOrderHistoryStatus.WAITING_FOR_PAYMENT]: 'Waiting for payment',
  [CustodyOrderHistoryStatus.CHECK_PENDING]: 'Check pending',
  [CustodyOrderHistoryStatus.PROCESSING]: 'Processing',
  [CustodyOrderHistoryStatus.COMPLETED]: 'Completed',
  [CustodyOrderHistoryStatus.FAILED]: 'Failed',
};

function formatAmount(amount?: number, asset?: string): string | undefined {
  if (amount === undefined || !asset) return undefined;
  return `${Utils.formatAmountCrypto(amount)} ${asset}`;
}

function formatTransfer(tx: CustodyOrderHistory): string {
  const input = formatAmount(tx.inputAmount, tx.inputAsset);
  const output = formatAmount(tx.outputAmount, tx.outputAsset);

  if (input && output) return `${output} → ${input}`;
  return input ?? output ?? '-';
}

export const TransactionHistory = ({ transactions, isLoading }: TransactionHistoryProps) => {
  const { translate } = useSettingsContext();

  return isLoading ? (
    <div className="w-full flex flex-col items-center justify-center gap-2 p-4">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : transactions?.length ? (
    <StyledVerticalStack full gap={2}>
      <h2 className="text-dfxBlue-800">{translate('screens/safe', 'Recent Activity')}</h2>
      <StyledDataTable alignContent={AlignContent.BETWEEN}>
        {transactions.map((tx, index) => (
          <StyledDataTableRow key={index}>
            <div className="w-full flex flex-row justify-between items-center gap-2 text-dfxBlue-800 p-2">
              <div className="flex flex-row items-center gap-3">
                {(tx.inputAsset ?? tx.outputAsset) && (
                  <DfxAssetIcon asset={(tx.inputAsset ?? tx.outputAsset) as AssetIconVariant} />
                )}
                <div className="text-base flex flex-col font-semibold text-left leading-none gap-1">
                  {translate('screens/safe', ORDER_TYPE_LABELS[tx.type])}
                  <div className="text-sm text-dfxGray-700">
                    {translate('screens/safe', STATUS_LABELS[tx.status])}
                  </div>
                </div>
              </div>
              <div className="text-base text-right font-semibold pr-1">{formatTransfer(tx)}</div>
            </div>
          </StyledDataTableRow>
        ))}
      </StyledDataTable>
    </StyledVerticalStack>
  ) : null;
};
