import {
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledDateAndTimePicker,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { NameEdit } from 'src/components/edit/name.edit';
import { ErrorHint } from 'src/components/error-hint';
import { Modal } from 'src/components/modal';
import { SafeCompletion } from 'src/components/payment/safe-completion';
import { ButtonGroup, ButtonGroupSize } from 'src/components/safe/button-group';
import { PriceChart } from 'src/components/safe/chart';
import { Portfolio } from 'src/components/safe/portfolio';
import { SafeTransactionInterface } from 'src/components/safe/safe-transaction-interface';
import { useOrderUIContext } from 'src/contexts/order-ui.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { FiatCurrency, SafeOperationType } from 'src/dto/safe.dto';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useSafe } from 'src/hooks/safe.hook';
import { formatCurrency } from 'src/util/utils';

interface PdfFormData {
  date: Date;
}

export default function SafeScreen(): JSX.Element {
  useUserGuard('/login');

  const { isInitialized, portfolio, history, isLoadingPortfolio, isLoadingHistory, error, downloadPdf } = useSafe();
  const { currency: userCurrency, translate } = useSettingsContext();
  const {
    completionType,
    showPaymentNameForm,
    bankAccountSelection,
    setCompletionType,
    setPaymentNameForm,
    setBankAccountSelection,
  } = useOrderUIContext();

  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PdfFormData>({
    mode: 'onChange',
    defaultValues: {
      date: new Date(),
    },
  });

  const onPdfSubmit = async (data: PdfFormData) => {
    try {
      await downloadPdf({
        date: data.date,
        currency: currency.toUpperCase() as 'CHF' | 'EUR' | 'USD',
      });
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
    setIsPdfModalOpen(false);
  };

  useEffect(() => {
    userCurrency && setCurrency(userCurrency?.name.toLowerCase() as FiatCurrency);
  }, [userCurrency]);

  const showChart = history.length > 1;

  const getTitle = () => {
    if (completionType) {
      switch (completionType) {
        case SafeOperationType.DEPOSIT:
          return translate('screens/safe', 'Deposit Complete');
        case SafeOperationType.RECEIVE:
          return translate('screens/safe', 'Receive Complete');
        case SafeOperationType.WITHDRAW:
          return translate('screens/safe', 'Withdraw Complete');
        case SafeOperationType.SEND:
          return translate('screens/safe', 'Send Complete');
        case SafeOperationType.SWAP:
          return translate('screens/safe', 'Swap Complete');
      }
    }
    if (bankAccountSelection) return translate('screens/sell', 'Select payment account');
    return translate('screens/safe', 'My DFX Safe');
  };

  const getBackHandler = () => {
    if (completionType) return () => setCompletionType();
    if (bankAccountSelection) return () => setBankAccountSelection(false);
    if (showPaymentNameForm) return () => setPaymentNameForm(false);
    return undefined;
  };

  useLayoutOptions({ title: getTitle(), onBack: getBackHandler() });

  return (
    <>
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : completionType ? (
        <SafeCompletion type={completionType} onClose={() => setCompletionType()} />
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
                    <div className="flex flex-row justify-between items-center">
                      <p className="text-dfxGray-700">{translate('screens/safe', 'Total portfolio value')}</p>
                      <button
                        className="p-2 rounded-lg hover:bg-dfxBlue-800/10 transition-colors cursor-pointer z-20"
                        onClick={() => setIsPdfModalOpen(true)}
                        title={translate('screens/safe', 'Download PDF')}
                      >
                        <DfxIcon icon={IconVariant.FILE} color={IconColor.BLUE} size={IconSize.MD} />
                      </button>
                    </div>
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
          <Portfolio portfolio={portfolio.balances.filter((b) => b.balance > 0)} currency={currency} isLoading={isLoadingPortfolio} />
          <SafeTransactionInterface />
        </StyledVerticalStack>
      )}

      <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)}>
        <StyledVerticalStack gap={6} full center>
          <h2 className="text-dfxBlue-800 text-xl font-bold">{translate('screens/safe', 'Download PDF')}</h2>
          <p className="text-dfxGray-700">{translate('screens/safe', 'Select a date for your portfolio report')}</p>
          <Form control={control} errors={errors} onSubmit={handleSubmit(onPdfSubmit)}>
            <StyledVerticalStack gap={6} full>
              <StyledDateAndTimePicker
                name="date"
                label={translate('screens/payment', 'Date')}
                smallLabel
              />
              <StyledButton
                label={translate('screens/safe', 'Generate PDF')}
                onClick={handleSubmit(onPdfSubmit)}
                width={StyledButtonWidth.FULL}
              />
            </StyledVerticalStack>
          </Form>
        </StyledVerticalStack>
      </Modal>
    </>
  );
}
