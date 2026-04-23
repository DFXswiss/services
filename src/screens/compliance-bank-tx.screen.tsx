import { StyledButton, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useLocation, useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { BankTxSearchResult } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';

function loadBankTx(id?: string, state?: unknown): BankTxSearchResult | undefined {
  const fromState = (state as { bankTx?: BankTxSearchResult } | null)?.bankTx;
  if (fromState) return fromState;
  if (!id) return undefined;
  try {
    const cached = sessionStorage.getItem(`bankTx:${id}`);
    return cached ? (JSON.parse(cached) as BankTxSearchResult) : undefined;
  } catch {
    return undefined;
  }
}

export default function ComplianceBankTxScreen(): JSX.Element {
  useComplianceGuard();

  const { id } = useParams<{ id: string }>();
  const { translate } = useSettingsContext();
  const { navigate, goBack } = useNavigation();
  const location = useLocation();
  const bankTx = loadBankTx(id, location.state);

  useLayoutOptions({ title: translate('screens/compliance', 'Bank Transaction'), backButton: true });

  if (!bankTx) {
    return (
      <StyledVerticalStack gap={6} full center>
        <ErrorHint message={translate('screens/compliance', 'No data available. Please open from search.')} />
        <StyledButton label={translate('general/actions', 'Back')} onClick={goBack} width={StyledButtonWidth.MD} />
      </StyledVerticalStack>
    );
  }

  const rows: [string, string | number | undefined][] = [
    [translate('screens/compliance', 'ID'), bankTx.id],
    [translate('screens/compliance', 'Transaction ID'), bankTx.transactionId],
    [translate('screens/compliance', 'Type'), bankTx.type],
    [translate('screens/compliance', 'Account Service Ref'), bankTx.accountServiceRef],
    [translate('screens/compliance', 'Amount'), `${bankTx.amount} ${bankTx.currency}`],
    [translate('screens/compliance', 'User name'), bankTx.name],
    [translate('screens/compliance', 'IBAN'), bankTx.iban],
  ];

  return (
    <StyledVerticalStack gap={6} full>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-dfxGray-300 last:border-0">
                <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800 align-top w-1/3">
                  {label}
                </th>
                <td className="px-4 py-3 text-left text-sm text-dfxBlue-800 break-all">{value ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bankTx.transactionId && (
        <StyledButton
          label={translate('screens/compliance', 'Return')}
          onClick={() => navigate(`/compliance/bank-tx/${bankTx.transactionId}/return`)}
          width={StyledButtonWidth.FULL}
        />
      )}
    </StyledVerticalStack>
  );
}
