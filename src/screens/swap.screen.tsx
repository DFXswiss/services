import {
  ApiError,
  Asset,
  Blockchain,
  Swap,
  TransactionError,
  TransactionType,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useAuthContext,
  useSessionContext,
  useSwap,
} from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconVariant,
  CopyButton,
  Form,
  IconColor,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInfoText,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledTextBox,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from '../components/error-hint';
import { ExchangeRate } from '../components/exchange-rate';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { AddressSwitch } from '../components/payment/address-switch';
import { QrCopy } from '../components/payment/qr-copy';
import { SwapCompletion } from '../components/payment/swap-completion';
import { SanctionHint } from '../components/sanction-hint';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useBlockchain } from '../hooks/blockchain.hook';
import { useClipboard } from '../hooks/clipboard.hook';
import useDebounce from '../hooks/debounce.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useTxHelper } from '../hooks/tx-helper.hook';
import { blankedAddress, isDefined } from '../util/utils';

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

interface FormData {
  sourceAsset: Asset;
  targetAsset: Asset;
  amount: string;
  address: Address;
}

interface CustomAmountError {
  key: string;
  defaultValue: string;
  interpolation?: Record<string, string | number> | undefined;
  hideInfos: boolean;
}

export default function SwapScreen(): JSX.Element {
  useSessionGuard();

  const { copy } = useClipboard();
  const { translate, translateError } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const { blockchain: walletBlockchain, activeWallet, switchBlockchain } = useWalletContext();
  const { getBalances, sendTransaction, canSendTransaction } = useTxHelper();
  const { availableBlockchains, logout } = useSessionContext();
  const { session } = useAuthContext();
  const { getAssets } = useAssetContext();
  const { getAsset } = useAsset();
  const { navigate } = useNavigation();
  const { assets, assetIn, assetOut, amountIn, blockchain, externalTransactionId, setParams } = useAppParams();
  const { receiveFor } = useSwap();
  const { toString } = useBlockchain();
  const rootRef = useRef<HTMLDivElement>(null);

  const [availableAssets, setAvailableAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<CustomAmountError>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Swap>();
  const [balances, setBalances] = useState<AssetBalance[]>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTxDone, setTxDone] = useState<boolean>(false);
  const [swapTxId, setSwapTxId] = useState<string>();
  const [showsSwitchScreen, setShowsSwitchScreen] = useState(false);

  useEffect(() => {
    availableAssets && getBalances(availableAssets).then(setBalances);
  }, [getBalances, availableAssets]);

  // form
  const { control, handleSubmit, setValue, resetField } = useForm<FormData>({ mode: 'onTouched' });

  const data = useWatch({ control });
  const selectedSourceAsset = useWatch({ control, name: 'sourceAsset' });
  const enteredAmount = useWatch({ control, name: 'amount' });
  const selectedAddress = useWatch({ control, name: 'address' });

  const availableBalance = selectedSourceAsset && findBalance(selectedSourceAsset);

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  const addressItems: Address[] = [
    {
      address: translate('screens/buy', 'Switch address'),
      label: translate('screens/buy', 'Login with a different address'),
    },
  ];
  session &&
    availableBlockchains &&
    addressItems.unshift(
      ...availableBlockchains.map((b) => ({
        address: blankedAddress(session.address),
        label: toString(b),
        chain: b,
      })),
    );

  useEffect(() => {
    const activeBlockchain = walletBlockchain ?? blockchain;
    const blockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(blockchains, { sellable: true, comingSoon: false });
    const activeAssets = assets
      ? assets
          .split(',')
          .map((a) => getAsset(blockchainAssets, a))
          .filter(isDefined)
      : blockchainAssets;
    setAvailableAssets(activeAssets);

    const sourceAsset = getAsset(activeAssets, assetIn) ?? (activeAssets.length === 1 && activeAssets[0]);
    if (sourceAsset) setVal('sourceAsset', sourceAsset);

    const targetAsset = getAsset(activeAssets, assetOut) ?? (activeAssets.length === 1 && activeAssets[0]);
    if (targetAsset) setVal('targetAsset', targetAsset);
  }, [assets, assetIn, assetOut, getAsset, getAssets, blockchain, walletBlockchain]);

  useEffect(() => {
    if (amountIn) setVal('amount', amountIn);
  }, [amountIn]);

  useEffect(() => setAddress(), [session?.address, translate]);

  useEffect(() => {
    if (selectedAddress) {
      if (selectedAddress.chain) {
        if (blockchain !== selectedAddress.chain) {
          setParams({ blockchain: selectedAddress.chain });
          switchBlockchain(selectedAddress.chain);
          resetField('targetAsset');
          setAvailableAssets(undefined);
        }
      } else {
        setShowsSwitchScreen(true);
        setAddress();
      }
    }
  }, [selectedAddress]);

  useEffect(() => {
    if (!enteredAmount) {
      setCustomAmountError(undefined);
    }
  }, [enteredAmount]);

  // data validation
  const validatedData = validateData(useDebounce(data, 500));
  const dataValid = validatedData != null;

  useEffect(() => {
    let isRunning = true;

    setErrorMessage(undefined);

    if (!dataValid) {
      setPaymentInfo(undefined);
      setIsLoading(false);
      setIsPriceLoading(false);
      return;
    }

    const amount = Number(validatedData.amount);
    const { sourceAsset, targetAsset } = validatedData;
    const data = { amount, sourceAsset, targetAsset, externalTransactionId };

    setIsLoading(true);
    receiveFor(data)
      .then((swap) => {
        if (isRunning) {
          validateSwap(swap);
          setPaymentInfo(swap);

          // load exact price
          if (swap && !swap.exactPrice) {
            setIsPriceLoading(true);
            receiveFor({ ...data, exactPrice: true })
              .then((info) => {
                if (isRunning) {
                  setPaymentInfo(info);
                  setIsPriceLoading(false);
                }
              })
              .catch(console.error);
          }
        }
      })
      .catch((error: ApiError) => {
        if (isRunning) {
          if (error.statusCode === 400 && error.message === 'Ident data incomplete') {
            navigate('/profile');
          } else {
            setPaymentInfo(undefined);
            setErrorMessage(error.message ?? 'Unknown error');
          }
        }
      })
      .finally(() => isRunning && setIsLoading(false));

    return () => {
      isRunning = false;
    };
  }, [validatedData]);

  function validateSwap(swap: Swap): void {
    // tx errors
    switch (swap.error) {
      case TransactionError.AMOUNT_TOO_LOW:
        setCustomAmountError({
          key: 'screens/payment',
          defaultValue: 'Entered amount is below minimum deposit of {{amount}} {{currency}}',
          interpolation: {
            amount: Utils.formatAmountCrypto(swap.minVolume),
            currency: swap.sourceAsset.name,
          },
          hideInfos: true,
        });
        return;

      case TransactionError.AMOUNT_TOO_HIGH:
        setCustomAmountError({
          key: 'screens/payment',
          defaultValue: 'Entered amount is above maximum deposit of {{amount}} {{currency}}',
          interpolation: {
            amount: Utils.formatAmountCrypto(swap.maxVolume),
            currency: swap.sourceAsset.name,
          },
          hideInfos: true,
        });
        return;

      case TransactionError.LIMIT_EXCEEDED:
      case TransactionError.KYC_REQUIRED:
      case TransactionError.KYC_REQUIRED_INSTANT:
      case TransactionError.BANK_TRANSACTION_MISSING:
        setKycError(swap.error);
        return;
    }

    // balance check
    const balance = findBalance(swap.sourceAsset) ?? 0;
    if (balances && swap.amount > Number(balance)) {
      setCustomAmountError({
        key: 'screens/payment',
        defaultValue: 'Entered amount is higher than available balance of {{amount}} {{asset}}',
        interpolation: {
          amount: balance,
          asset: swap.sourceAsset.name,
        },
        hideInfos: false,
      });
      return;
    }

    setCustomAmountError(undefined);
    setKycError(undefined);
  }

  function validateData(data?: DeepPartial<FormData>): FormData | undefined {
    if (data && Number(data.amount) > 0 && data.sourceAsset != null && data.targetAsset != null) {
      return data as FormData;
    }
  }

  function findBalance(asset: Asset): number | undefined {
    return balances?.find((b) => b.asset.id === asset.id)?.amount;
  }

  function findBalanceString(asset: Asset): string {
    const balance = findBalance(asset);
    return balance != null ? Utils.formatAmountCrypto(balance) : '';
  }

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  function setAddress() {
    if (session?.address) {
      const address = addressItems.find((a) => blockchain && a.chain === blockchain) ?? addressItems[0];
      setVal('address', address);
    }
  }

  function onAddressSwitch() {
    logout();
    navigate('/switch', { setRedirect: true });
  }

  async function handleNext(paymentInfo: Swap): Promise<void> {
    setIsProcessing(true);

    if (canSendTransaction() && !activeWallet) return close(paymentInfo, false);

    try {
      if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSwapTxId);

      setTxDone(true);
    } finally {
      setIsProcessing(false);
    }
  }

  function close(swap: Swap, isComplete: boolean) {
    closeServices({ type: CloseType.SWAP, isComplete, swap }, isComplete);
  }

  const rules = Utils.createRules({
    bankAccount: Validations.Required,
    asset: Validations.Required,
    currency: Validations.Required,
    amount: Validations.Required,
  });

  return (
    <Layout title={translate('general/services', 'Swap')} textStart rootRef={rootRef}>
      {paymentInfo && isTxDone ? (
        <SwapCompletion paymentInfo={paymentInfo} navigateOnClose={true} txId={swapTxId} />
      ) : showsSwitchScreen ? (
        <AddressSwitch onClose={(r) => (r ? onAddressSwitch() : setShowsSwitchScreen(false))} />
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={{}}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
          hasFormElement={false}
        >
          {availableAssets && (
            <StyledVerticalStack gap={8} full center className="relative">
              <StyledVerticalStack gap={2} full>
                <h2 className="text-dfxGray-700">{translate('screens/buy', 'You spend')}</h2>
                <StyledHorizontalStack gap={1}>
                  <div className="flex-[3_1_9rem]">
                    <StyledInput
                      type="number"
                      placeholder="0.00"
                      prefix={selectedSourceAsset && selectedSourceAsset.name}
                      name="amount"
                      buttonLabel={availableBalance ? 'MAX' : undefined}
                      buttonClick={() => availableBalance && setVal('amount', `${availableBalance}`)}
                      forceError={
                        (kycError && kycError === TransactionError.BANK_TRANSACTION_MISSING) ||
                        customAmountError != null
                      }
                      forceErrorMessage={
                        customAmountError &&
                        translate(
                          customAmountError.key,
                          customAmountError.defaultValue,
                          customAmountError.interpolation,
                        )
                      }
                      full
                    />
                  </div>

                  <div className="flex-[1_0_9rem]">
                    <StyledSearchDropdown<Asset>
                      rootRef={rootRef}
                      name="sourceAsset"
                      placeholder={translate('general/actions', 'Select...')}
                      items={availableAssets}
                      labelFunc={(item) => item.name}
                      balanceFunc={findBalanceString}
                      assetIconFunc={(item) => item.name as AssetIconVariant}
                      descriptionFunc={(item) => toString(item.blockchain)}
                      filterFunc={(item: Asset, search?: string | undefined) =>
                        !search || item.name.toLowerCase().includes(search.toLowerCase())
                      }
                      hideBalanceWhenClosed
                      full
                    />
                  </div>
                </StyledHorizontalStack>
              </StyledVerticalStack>

              <StyledVerticalStack gap={2} full>
                <h2 className="text-dfxGray-700">{translate('screens/buy', 'You get about')}</h2>

                <StyledHorizontalStack gap={1}>
                  <div className="flex-[3_1_9rem]">
                    <StyledTextBox
                      text={
                        paymentInfo && !isLoading ? `≈ ${Utils.formatAmountCrypto(paymentInfo.estimatedAmount)}` : ' '
                      }
                      loading={!isLoading && isPriceLoading}
                      full
                    />
                  </div>
                  <div className="flex-[1_0_9rem]">
                    <div className="flex-[1_0_9rem]">
                      <StyledSearchDropdown<Asset>
                        rootRef={rootRef}
                        name="targetAsset"
                        placeholder={translate('general/actions', 'Select...')}
                        items={availableAssets}
                        labelFunc={(item) => item.name}
                        balanceFunc={findBalanceString}
                        assetIconFunc={(item) => item.name as AssetIconVariant}
                        descriptionFunc={(item) => toString(item.blockchain)}
                        filterFunc={(item: Asset, search?: string | undefined) =>
                          !search || item.name.toLowerCase().includes(search.toLowerCase())
                        }
                        hideBalanceWhenClosed
                        full
                      />
                    </div>
                  </div>
                </StyledHorizontalStack>

                <StyledDropdown<Address>
                  rootRef={rootRef}
                  name="address"
                  items={addressItems}
                  labelFunc={(item) => item.address}
                  descriptionFunc={(item) => item.label}
                  full
                  forceEnable
                />
              </StyledVerticalStack>

              {isLoading && (
                <StyledVerticalStack center>
                  <StyledLoadingSpinner size={SpinnerSize.LG} />
                </StyledVerticalStack>
              )}

              {!isLoading && kycError && !customAmountError && <KycHint type={TransactionType.SWAP} error={kycError} />}

              {!isLoading && errorMessage && (
                <StyledVerticalStack center className="text-center">
                  <ErrorHint message={errorMessage} />

                  <StyledButton
                    width={StyledButtonWidth.MIN}
                    label={translate('general/actions', 'Retry')}
                    onClick={() => setVal('amount', enteredAmount)} // re-trigger
                    className="my-4"
                    color={StyledButtonColor.STURDY_WHITE}
                  />
                </StyledVerticalStack>
              )}

              {!isLoading && paymentInfo && !kycError && !errorMessage && !customAmountError?.hideInfos && (
                <>
                  <ExchangeRate
                    exchangeRate={1 / paymentInfo.exchangeRate}
                    rate={1 / paymentInfo.rate}
                    fees={paymentInfo.fees}
                    feeCurrency={paymentInfo.sourceAsset}
                    from={paymentInfo.sourceAsset}
                    to={paymentInfo.targetAsset}
                  />

                  <StyledVerticalStack gap={2} full>
                    <h2 className="text-dfxBlue-800 text-center">
                      {translate('screens/payment', 'Payment Information')}
                    </h2>
                    <div className="text-left">
                      <StyledInfoText iconColor={IconColor.BLUE}>
                        {translate(
                          'screens/swap',
                          'Send the selected amount to the address below. This address can be used multiple times, it is always the same for swaps from {{sourceChain}} to {{asset}} on {{targetChain}}.',
                          {
                            sourceChain: toString(paymentInfo.sourceAsset.blockchain),
                            targetChain: toString(paymentInfo.targetAsset.blockchain),
                            asset: paymentInfo.targetAsset.name,
                          },
                        )}
                      </StyledInfoText>
                    </div>

                    <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                      <StyledDataTableRow label={translate('screens/sell', 'Address')}>
                        <div>
                          <p>{blankedAddress(paymentInfo.depositAddress)}</p>
                        </div>
                        <CopyButton onCopy={() => copy(paymentInfo.depositAddress)} />
                      </StyledDataTableRow>
                    </StyledDataTable>
                  </StyledVerticalStack>

                  {paymentInfo.paymentRequest && !canSendTransaction() && (
                    <StyledVerticalStack full center>
                      <p className="font-semibold text-sm text-dfxBlue-800">
                        {translate('screens/sell', 'Pay with your wallet')}
                      </p>
                      <QrCopy data={paymentInfo.paymentRequest} />
                    </StyledVerticalStack>
                  )}

                  <SanctionHint />

                  <div className="w-full leading-none">
                    <StyledLink
                      label={translate(
                        'screens/payment',
                        'Please note that by using this service you automatically accept our terms and conditions. The effective exchange rate is fixed when the money is received and processed by DFX.',
                      )}
                      url={process.env.REACT_APP_TNC_URL}
                      small
                      dark
                    />
                    <StyledButton
                      width={StyledButtonWidth.FULL}
                      label={translate(
                        'screens/sell',
                        canSendTransaction()
                          ? 'Complete transaction in your wallet'
                          : 'Click here once you have issued the transaction',
                      )}
                      onClick={() => handleNext(paymentInfo)}
                      caps={false}
                      className="my-4"
                      isLoading={isProcessing}
                    />
                  </div>
                </>
              )}
            </StyledVerticalStack>
          )}
        </Form>
      )}
    </Layout>
  );
}
