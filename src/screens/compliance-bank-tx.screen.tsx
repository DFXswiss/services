import { StyledButton, StyledButtonColor, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useLocation, useParams } from 'react-router-dom';
import { useSettingsContext } from 'src/contexts/settings.context';
import { BankTxSearchResult } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { readCachedBankTx } from 'src/util/bank-tx-cache';
import { DetailRow } from 'src/util/compliance-helpers';

function loadBankTx(id?: string, state?: unknown): BankTxSearchResult | undefined {
  const fromState = (state as { bankTx?: BankTxSearchResult } | null)?.bankTx;
  if (fromState) return fromState;
  return id ? readCachedBankTx(id) : undefined;
}

export default function ComplianceBankTxScreen(): JSX.Element {
  useComplianceGuard();

  const { id } = useParams<{ id: string }>();
  const { translate } = useSettingsContext();
  const { navigate, goBack } = useNavigation();
  const location = useLocation();
  const bankTx = loadBankTx(id, location.state);

  useLayoutOptions({ title: 'Bank Transaction Details', backButton: true });

  if (!bankTx) {
    return (
      <StyledVerticalStack gap={6} full center>
        <p className="text-dfxGray-700">No data available. Please open from search.</p>
        <StyledButton
          label={translate('general/actions', 'Back')}
          onClick={goBack}
          width={StyledButtonWidth.MD}
          color={StyledButtonColor.GRAY_OUTLINE}
        />
      </StyledVerticalStack>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 max-w-4xl text-left">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <table className="text-sm text-dfxBlue-800 text-left">
          <tbody>
            <DetailRow label="ID" value={bankTx.id} />
            <DetailRow label="Transaction ID" value={bankTx.transactionId} />
            <DetailRow label="Type" value={bankTx.type} />
            <DetailRow label="Account Service Ref" value={bankTx.accountServiceRef} />
            <DetailRow label="Amount" value={`${bankTx.amount} ${bankTx.currency}`} />
            <DetailRow label="Name" value={bankTx.name} />
            <DetailRow label="IBAN" value={bankTx.iban} mono />
          </tbody>
        </table>
      </div>

      {bankTx.transactionId && (
        <StyledButton
          label="Return"
          onClick={() => navigate(`compliance/bank-tx/${bankTx.transactionId}/return`)}
          width={StyledButtonWidth.FULL}
          color={StyledButtonColor.BLUE}
        />
      )}
    </div>
  );
}
