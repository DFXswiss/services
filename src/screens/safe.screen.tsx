import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useRef, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
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
  const { translate } = useSettingsContext();

  const rootRef = useRef<HTMLDivElement>(null);

  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);

  return (
    <Layout rootRef={rootRef} title={translate('screens/safe', 'My DFX Safe')}>
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="flex flex-col w-full gap-4">
          <div className="shadow-card rounded-xl">
            <div id="chart-timeline" className="relative">
              <div className="p-2 gap-2 flex flex-col items-start">
                <div className="w-full flex-col">
                  <h2 className="text-dfxBlue-800 text-left">{translate('screens/safe', 'Portfolio')}</h2>
                  <p className="text-dfxGray-700 text-left">{translate('screens/safe', 'Total portfolio value')}</p>
                </div>
                {isLoadingPortfolio ? (
                  <div className="leading-none">
                    <StyledLoadingSpinner size={SpinnerSize.MD} />
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <div className="flex flex-row items-center gap-3">
                      <ButtonGroup<FiatCurrency>
                        items={Object.values(FiatCurrency)}
                        selected={currency}
                        onClick={(_currency) => setCurrency(_currency)}
                        buttonLabel={(_currency) => _currency.toUpperCase()}
                        size={'sm'}
                      />
                      <div className="text-dfxBlue-800">
                        <span className="text-base font-bold leading-tight">
                          {formatCurrency(totalValue[currency], 2, 2)}
                        </span>{' '}
                        <span className="text-base font-[350] leading-tight">{currency.toUpperCase()}</span>
                      </div>
                    </div>
                    <PriceChart isLoading={isLoadingHistory} history={history} currency={currency} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="px-2 text-dfxBlue-500 text-left text-lg font-semibold">
            {translate('screens/safe', 'Assets')}
          </div>
          <Portfolio portfolio={portfolio} currency={currency} isLoading={isLoadingPortfolio} />
        </div>
      )}
    </Layout>
  );
}
