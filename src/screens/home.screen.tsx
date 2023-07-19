import { useState } from 'react';
import { useSessionContext, useUserContext } from '@dfx.swiss/react';
import { Layout } from '../components/layout';
import { ServiceButton, ServiceButtonType } from '../components/service-button';
import { useBalanceContext } from '../contexts/balance.context';
import { useLanguageContext } from '../contexts/language.context';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useIframe } from '../hooks/iframe.hook';

export function HomeScreen(): JSX.Element {
  const { isLoggedIn } = useSessionContext();
  const { user, isUserLoading } = useUserContext();
  const { translate } = useLanguageContext();
  const { hasBalance } = useBalanceContext();
  const { checkIfUsedByIframe } = useIframe();
  const [isUsedByIframe] = useState(checkIfUsedByIframe);

  function content(): JSX.Element {
    return (
      <>
        {!isUsedByIframe && displayBrowserContent()}

        {isLoggedIn && user ? (
        <div className="flex flex-col gap-8 py-8">
          <ServiceButton type={ServiceButtonType.BUY} url="/buy" />
          <ServiceButton
            type={ServiceButtonType.SELL}
            url={user?.kycDataComplete ? '/sell' : '/profile'}
            disabled={!hasBalance}
          />
          {/* <ServiceButton type={ServiceButtonType.CONVERT} url="/convert" disabled /> */}
        </div>
        ) : (
        <p className="text-dfxGray-700 py-8">
          {translate('screens/home', 'Please login via an application to use our services')}
        </p>
        )}
      </>
    );
  }

  function displayBrowserContent(): JSX.Element {
    return (
      <>
        <h2 className="text-dfxBlue-800">
          {translate('screens/home', 'DFX services')}
        </h2>
        <p className="text-dfxGray-700">
          {translate('screens/home', 'Buy and Sell cryptocurrencies with bank transfers')}
        </p>
      </>
    );
  }

  return (
    <Layout>
      {isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        content()
      )}
    </Layout>
  );
}
