import { SpinnerSize, StyledButton, StyledButtonWidth, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConfirmationOverlay } from 'src/components/overlay/confirmation-overlay';
import { useRealunitContext } from 'src/contexts/realunit.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useRealunitGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress } from 'src/util/utils';

export default function RealunitQuoteDetailScreen(): JSX.Element {
  useRealunitGuard();

  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { id } = useParams<{ id: string }>();
  const { quotes, quotesLoading, fetchQuotes, resetQuotes, confirmPayment } = useRealunitContext();
  const [showConfirmation, setShowConfirmation] = useState(false);

  useLayoutOptions({ title: translate('screens/realunit', 'Quote Detail'), backButton: true });

  useEffect(() => {
    if (!quotes.length) fetchQuotes();
  }, [fetchQuotes]);

  const quote = quotes.find((q) => q.id === Number(id));

  const displayType = (type: string): string => {
    switch (type) {
      case 'BuyFiat':
        return 'Sell';
      case 'BuyCrypto':
        return 'Buy';
      default:
        return type;
    }
  };

  if (quotesLoading && !quotes.length) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  if (!quote) {
    return <p className="text-dfxGray-700">{translate('screens/realunit', 'Quote not found')}</p>;
  }

  return (
    <div className="w-full">
      <h2 className="text-dfxGray-700 mb-4">{translate('screens/realunit', 'Quote Detail')}</h2>
      <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
        <thead>
          <tr className="bg-dfxGray-300">
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/realunit', 'Key')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
              {translate('screens/realunit', 'Value')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {translate('screens/realunit', 'Type')}
            </td>
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{displayType(quote.type)}</td>
          </tr>
          <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {translate('screens/realunit', 'Status')}
            </td>
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{quote.status}</td>
          </tr>
          <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {translate('screens/realunit', 'Amount')}
            </td>
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{quote.amount?.toLocaleString()}</td>
          </tr>
          <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {translate('screens/realunit', 'Estimated Amount')}
            </td>
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {quote.estimatedAmount?.toLocaleString()}
            </td>
          </tr>
          <tr className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {translate('screens/realunit', 'User')}
            </td>
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {quote.userAddress ? (
                <button
                  type="button"
                  className="text-left text-sm text-dfxBlue-800 cursor-pointer hover:text-dfxBlue-600 hover:underline break-all bg-transparent border-0 p-0"
                  onClick={() => navigate(`/realunit/user/${encodeURIComponent(quote.userAddress ?? '')}`)}
                >
                  {blankedAddress(quote.userAddress, { displayLength: 22 })}
                </button>
              ) : (
                '-'
              )}
            </td>
          </tr>
          <tr className="transition-colors hover:bg-dfxGray-300">
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {translate('screens/realunit', 'Created')}
            </td>
            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
              {new Date(quote.created).toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {quote.status === 'WaitingForPayment' && (
        <div className="mt-6">
          <StyledButton
            label={translate('screens/realunit', 'Confirm Payment Received')}
            onClick={() => setShowConfirmation(true)}
            width={StyledButtonWidth.FULL}
          />
        </div>
      )}

      {showConfirmation && (
        <ConfirmationOverlay
          message={translate(
            'screens/realunit',
            'Are you sure you want to confirm the payment receipt?',
          )}
          cancelLabel={translate('general/actions', 'Cancel')}
          confirmLabel={translate('general/actions', 'Confirm')}
          onCancel={() => setShowConfirmation(false)}
          onConfirm={async () => {
            await confirmPayment(quote.id);
            resetQuotes();
            setShowConfirmation(false);
            navigate(-1);
          }}
        />
      )}
    </div>
  );
}
