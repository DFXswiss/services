import {
  AlignContent,
  DfxIcon,
  IconColor,
  IconSize,
  IconVariant,
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
  [CustodyOrderType.DEPOSIT]: 'Fiat Deposit',
  [CustodyOrderType.WITHDRAWAL]: 'Fiat Withdrawal',
  [CustodyOrderType.RECEIVE]: 'Crypto Deposit',
  [CustodyOrderType.SEND]: 'Crypto Withdrawal',
  [CustodyOrderType.SWAP]: 'Swap',
  [CustodyOrderType.SAVING_DEPOSIT]: 'Saving Deposit',
  [CustodyOrderType.SAVING_WITHDRAWAL]: 'Saving Withdrawal',
};

const ORDER_TYPE_ICONS: Record<CustodyOrderType, IconVariant> = {
  [CustodyOrderType.DEPOSIT]: IconVariant.BANK,
  [CustodyOrderType.WITHDRAWAL]: IconVariant.BANK,
  [CustodyOrderType.RECEIVE]: IconVariant.WALLET,
  [CustodyOrderType.SEND]: IconVariant.WALLET,
  [CustodyOrderType.SWAP]: IconVariant.SWAP,
  [CustodyOrderType.SAVING_DEPOSIT]: IconVariant.SAFE,
  [CustodyOrderType.SAVING_WITHDRAWAL]: IconVariant.SAFE,
};

const STATUS_LABELS: Record<CustodyOrderHistoryStatus, string> = {
  [CustodyOrderHistoryStatus.WAITING_FOR_PAYMENT]: 'Waiting for payment',
  [CustodyOrderHistoryStatus.CHECK_PENDING]: 'Check pending',
  [CustodyOrderHistoryStatus.PROCESSING]: 'Processing',
  [CustodyOrderHistoryStatus.COMPLETED]: 'Completed',
  [CustodyOrderHistoryStatus.FAILED]: 'Failed',
};

export const TransactionHistory = ({ transactions, isLoading }: TransactionHistoryProps) => {
  const { translate } = useSettingsContext();

  const formatAmount = (amount?: number, asset?: string): string => {
    if (amount === undefined || !asset) return '-';
    return `${amount.toFixed(2)} ${asset}`;
  };

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
                <DfxIcon icon={ORDER_TYPE_ICONS[tx.type]} color={IconColor.BLUE} size={IconSize.MD} />
                <div className="text-base flex flex-col font-semibold text-left leading-none gap-1">
                  {translate('screens/safe', ORDER_TYPE_LABELS[tx.type])}
                  <div className="text-sm text-dfxGray-700">{translate('screens/safe', STATUS_LABELS[tx.status])}</div>
                </div>
              </div>
              <div className="text-base text-right flex flex-col font-semibold leading-none gap-1 pr-1">
                <div className="text-dfxGray-700 text-sm">{formatAmount(tx.inputAmount, tx.inputAsset)}</div>
                <div className="text-dfxBlue-800">{formatAmount(tx.outputAmount, tx.outputAsset)}</div>
              </div>
            </div>
          </StyledDataTableRow>
        ))}
      </StyledDataTable>
    </StyledVerticalStack>
  ) : null;
};
