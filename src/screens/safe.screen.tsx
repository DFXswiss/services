import { SpinnerSize, StyledLoadingSpinner, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { NameEdit } from 'src/components/edit/name.edit';
import { ErrorHint } from 'src/components/error-hint';
import { SafeCompletion } from 'src/components/payment/safe-completion';
import { ButtonGroup, ButtonGroupSize } from 'src/components/safe/button-group';
import { PriceChart } from 'src/components/safe/chart';
import { DepositInterface } from 'src/components/safe/deposit-interface';
import { Portfolio } from 'src/components/safe/portfolio';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { FiatCurrency } from 'src/dto/safe.dto';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { formatCurrency } from 'src/util/utils';
import { Layout } from '../components/layout';

export default function SafeScreen(): JSX.Element {
  useUserGuard('/login');

  const { isInitialized, portfolio, history, isLoadingPortfolio, isLoadingHistory, error } = useSafe();
  const { currency: userCurrency, translate } = useSettingsContext();
  const {
    showsCompletion,
    showPaymentNameForm,
    bankAccountSelection,
    setCompletion,
    setPaymentNameForm,
    setBankAccountSelection,
  } = useOrderUIContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);

  useEffect(() => {
    userCurrency && setCurrency(userCurrency?.name.toLowerCase() as FiatCurrency);
  }, [userCurrency]);

  const showChart = history.length > 1;

  const getTitle = () => {
    if (showsCompletion) return translate('screens/safe', 'Deposit Complete');
    if (bankAccountSelection) return translate('screens/sell', 'Select payment account');
    return translate('screens/safe', 'My DFX Safe');
  };

  const getBackHandler = () => {
    if (showsCompletion) return () => setCompletion(false);
    if (bankAccountSelection) return () => setBankAccountSelection(false);
    if (showPaymentNameForm) return () => setPaymentNameForm(false);
    return undefined;
  };

  return (
    <Layout rootRef={rootRef} title={getTitle()} onBack={getBackHandler()}>
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : showsCompletion ? (
        <SafeCompletion onClose={() => setCompletion(false)} />
      ) : showPaymentNameForm ? (
        // TODO (later?): Retrigger payment execution after name edit
        <NameEdit onSuccess={() => setPaymentNameForm(false)} />
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
                        onClick={setCurrency}
                        buttonLabel={(currency) => currency.toUpperCase()}
                        size={ButtonGroupSize.SM}
                      />
                      {isLoadingPortfolio ? (
                        <div>
                          <StyledLoadingSpinner size={SpinnerSize.MD} />
                        </div>
                      ) : (
                        <div className="text-dfxBlue-800">
                          <span className="text-lg font-bold">
                            {formatCurrency(portfolio.totalValue[currency], 2, 2)}
                          </span>{' '}
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
          <Portfolio portfolio={portfolio.balances} currency={currency} isLoading={isLoadingPortfolio} />
          <DepositInterface />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
