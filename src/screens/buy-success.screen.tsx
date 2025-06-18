import { ApiError, useTransaction, useUserContext } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { BuyCompletion } from '../components/payment/buy-completion';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useAddressGuard } from '../hooks/guard.hook';
import { useLayoutOptions } from '../hooks/layout-config.hook';
import { useNavigation } from '../hooks/navigation.hook';

export default function BuySuccessScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { user } = useUserContext();
  const [params] = useSearchParams();
  const { getTransactionByCkoId } = useTransaction();
  const { closeServices } = useAppHandlingContext();

  const [error, setError] = useState<string>();

  const ckoId = params.get('cko-payment-id');

  useAddressGuard('/', ckoId == null);

  useEffect(() => {
    if (ckoId) fetchCkoTx(ckoId);
  }, [ckoId]);

  useEffect(() => {
    if (ckoId) closeServices({ type: CloseType.BUY, isComplete: true }, false);
  }, [ckoId]);

  function fetchCkoTx(id: string) {
    getTransactionByCkoId(id)
      .then((tx) => navigate({ pathname: `/tx/${tx.uid}` }, { clearParams: ['cko-payment-id', 'cko-session-id'] }))
      .catch((e: ApiError) =>
        e.statusCode === 404 ? setTimeout(() => fetchCkoTx(id), 3000) : setError(e.message ?? 'Unknown error'),
      );
  }

  useLayoutOptions({
    title: translate('screens/buy', ckoId ? 'Buy' : 'Done!'),
    backButton: false,
    textStart: true,
  });

  return (
    <>
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
    </>
  );
}
