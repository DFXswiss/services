import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { SafeDepositInterface } from 'src/components/order/safe-deposit-interface';
import { ButtonGroup } from 'src/components/safe/button-group';
import { PriceChart } from 'src/components/safe/chart';
import { Portfolio } from 'src/components/safe/portfolio';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { FiatCurrency, useSafe } from 'src/hooks/safe.hook';
import { formatCurrency } from 'src/util/utils';
import { Layout } from '../components/layout';

export default function SafeScreen(): JSX.Element {
  useUserGuard('/login');

  const { isInitialized, totalValue, portfolio, history, isLoadingPortfolio, isLoadingHistory, error } = useSafe();
  const { currency: userCurrency, translate } = useSettingsContext();

  const rootRef = useRef<HTMLDivElement>(null);

  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);

  useEffect(() => {
    userCurrency && setCurrency(userCurrency?.name.toLowerCase() as FiatCurrency);
  }, [userCurrency]);

  const showChart = history.length > 1;

  return (
    <Layout rootRef={rootRef} title={translate('screens/safe', 'My Safe')}>
      {/* TODO: Add "DFX": My DFX Safe */}
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <StyledVerticalStack full gap={10} className="p-4">
          <div className="shadow-card rounded-xl">
            <div id="chart-timeline" className="relative">
              <div className="p-2 gap-2 flex flex-col items-start">
                <div className="relative w-full" style={{ height: showChart ? '350px' : '85px' }}>
                  <div className="w-full flex flex-col gap-3 text-left leading-none z-10">
                    <h2 className="text-dfxBlue-800">{translate('screens/safe', 'Portfolio')}</h2>
                    <p className="text-dfxGray-700">{translate('screens/safe', 'Total portfolio value')}</p>
                    <div className="flex flex-row items-center gap-3 z-10">
                      <ButtonGroup<FiatCurrency>
                        items={Object.values(FiatCurrency)}
                        selected={currency}
                        onClick={(_currency) => setCurrency(_currency)}
                        buttonLabel={(_currency) => _currency.toUpperCase()}
                        size={'sm'}
                      />
                      {isLoadingPortfolio ? (
                        <div className="">
                          <StyledLoadingSpinner size={SpinnerSize.MD} />
                        </div>
                      ) : (
                        <div className="text-dfxBlue-800">
                          <span className="text-lg font-bold">{formatCurrency(totalValue[currency], 2, 2)}</span>{' '}
                          <span className="text-base">{currency.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute inset-0">
                    {showChart && <PriceChart history={history} currency={currency} isLoading={isLoadingHistory} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Portfolio portfolio={portfolio} currency={currency} isLoading={isLoadingPortfolio} />
          <SafeDepositInterface />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
