import { ApiError, useTransaction, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { BuyCompletion } from '../components/payment/buy-completion';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function BuySuccessScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const [params] = useSearchParams();
  const { getTransactionByCkoId } = useTransaction();

  const [error, setError] = useState<string>();

  const ckoId = params.get('cko-payment-id');

  useEffect(() => {
    if (ckoId) fetchCkoTx(ckoId);
  }, [ckoId]);

  function fetchCkoTx(id: string) {
    getTransactionByCkoId(id)
      .then((tx) => navigate(`/tx/${tx.id}`))
      .catch((e: ApiError) => {
        if (e.statusCode != 404) setError(e.message ?? 'Unknown error');

        setTimeout(() => fetchCkoTx(id), 3000);
      });
  }

  return (
    <Layout title={translate('screens/buy', ckoId ? 'Buy' : 'Done!')} backButton={false} textStart>
      {ckoId ? (
        <>
          {error ? (
            <ErrorHint message={error} />
          ) : (
            <StyledVerticalStack gap={2} center>
              <StyledLoadingSpinner size={SpinnerSize.LG} />
              <p className="text-dfxGray-800">
                {translate('screens/buy', 'Waiting for the payment confirmation ... this may take a moment.')}
              </p>
            </StyledVerticalStack>
          )}
        </>
      ) : (
        <BuyCompletion user={user} navigateOnClose />
      )}
    </Layout>
  );
}
