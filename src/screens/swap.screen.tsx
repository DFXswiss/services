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
  useUserContext,
} from '@dfx.swiss/react';
import {
  AssetIconVariant,
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledTextBox,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { DeepPartial, FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { PaymentInformationContent } from 'src/components/payment/payment-info-sell';
import { useWindowContext } from 'src/contexts/window.context';
import { blankedAddress } from 'src/util/utils';
import { ErrorHint } from '../components/error-hint';
import { ExchangeRate } from '../components/exchange-rate';
import { KycHint } from '../components/kyc-hint';
import { Layout } from '../components/layout';
import { AddressSwitch } from '../components/payment/address-switch';
import { SwapCompletion } from '../components/payment/swap-completion';
import { SanctionHint } from '../components/sanction-hint';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useBlockchain } from '../hooks/blockchain.hook';
import useDebounce from '../hooks/debounce.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useTxHelper } from '../hooks/tx-helper.hook';

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
  useAddressGuard('/connect');

  const { translate, translateError } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const { blockchain: walletBlockchain, activeWallet, switchBlockchain } = useWalletContext();
  const { getBalances, sendTransaction, canSendTransaction } = useTxHelper();
  const { availableBlockchains, logout } = useSessionContext();
  const { session } = useAuthContext();
  const { width } = useWindowContext();
  const { user } = useUserContext();
  const { assets, getAssets } = useAssetContext();
  const { getAsset, isSameAsset } = useAsset();
  const { navigate } = useNavigation();
  const {
    assets: assetFilter,
    assetIn,
    assetOut,
    amountIn,
    blockchain,
    hideTargetSelection,
    externalTransactionId,
    setParams,
  } = useAppParams();
  const { receiveFor } = useSwap();
  const { toString } = useBlockchain();
  const rootRef = useRef<HTMLDivElement>(null);

  const [sourceAssets, setSourceAssets] = useState<Asset[]>();
  const [targetAssets, setTargetAssets] = useState<Asset[]>();
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
    sourceAssets && getBalances(sourceAssets).then(setBalances);
  }, [getBalances, sourceAssets]);

  // form
  const { control, handleSubmit, setValue, resetField } = useForm<FormData>({ mode: 'onTouched' });

  const data = useWatch({ control });
  const selectedSourceAsset = useWatch({ control, name: 'sourceAsset' });
  const enteredAmount = useWatch({ control, name: 'amount' });
  const selectedAddress = useWatch({ control, name: 'address' });

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  const availableBalance = selectedSourceAsset && findBalance(selectedSourceAsset);

  const SwapInputBlockchains: Blockchain[] = [
    Blockchain.BITCOIN,
    Blockchain.LIGHTNING,
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
  ];

  const filteredAssets = assets && filterAssets(Array.from(assets.values()).flat(), assetFilter);
  const sourceBlockchains = availableBlockchains?.filter(
    (b) => SwapInputBlockchains.includes(b) && filteredAssets?.some((a) => a.blockchain === b),
  );

  const userAddresses = (
    [
      session?.address && { address: session.address, blockchains: session.blockchains },
      ...(user?.addresses.map((a) => ({ address: a.address, blockchains: a.blockchains })) ?? []),
    ] as { address: string; blockchains: Blockchain[] }[]
  ).filter((a, i, arr) => a && arr.findIndex((b) => b?.address === a.address) === i);

  const targetBlockchains = userAddresses
    .flatMap((a) => a.blockchains)
    .filter((b, i, arr) => arr.indexOf(b) === i)
    .filter((b) => filteredAssets?.some((a) => a.blockchain === b));

  const addressItems: Address[] =
    userAddresses.length > 0 && targetBlockchains?.length
      ? [
          ...userAddresses.flatMap(({ address, blockchains }) =>
            blockchains
              .filter((b) => targetBlockchains.includes(b))
              .map((b) => ({ address: blankedAddress(address, { width }), label: toString(b), chain: b })),
          ),
          {
            address: translate('screens/buy', 'Switch address'),
            label: translate('screens/buy', 'Login with a different address'),
          },
        ]
      : [];

  useEffect(() => {
    const blockchainSourceAssets = getAssets(sourceBlockchains ?? [], { sellable: true, comingSoon: false });
    const activeSourceAssets = filterAssets(blockchainSourceAssets, assetFilter);
    setSourceAssets(activeSourceAssets);

    const activeTargetBlockchains = blockchain ? [blockchain as Blockchain] : targetBlockchains ?? [];
    const blockchainTargetAssets = getAssets(activeTargetBlockchains ?? [], { buyable: true, comingSoon: false });
    const activeTargetAssets = filterAssets(blockchainTargetAssets, assetFilter);
    setTargetAssets(activeTargetAssets);

    const sourceAsset =
      getAsset(activeSourceAssets, assetIn) ?? (activeSourceAssets.length === 1 && activeSourceAssets[0]);
    if (sourceAsset) setVal('sourceAsset', sourceAsset);

    const targetAsset =
      getAsset(activeTargetAssets, assetOut) ?? (activeTargetAssets.length === 1 && activeTargetAssets[0]);
    if (targetAsset) setVal('targetAsset', targetAsset);
  }, [assetFilter, assetIn, assetOut, getAsset, getAssets, blockchain, walletBlockchain]);

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
          setTargetAssets(undefined);
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
          if (swap) {
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
  }, [validatedData, session?.address]);

  function validateSwap(swap: Swap): void {
    setCustomAmountError(undefined);
    setKycError(undefined);

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
      case TransactionError.KYC_DATA_REQUIRED:
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

  // misc
  function filterAssets(assets: Asset[], filter?: string): Asset[] {
    if (!filter) return assets;

    const allowedAssets = filter.split(',');
    return assets.filter((a) => allowedAssets.some((f) => isSameAsset(a, f)));
  }

  function getPaymentInfoString(paymentInfo: Swap): string {
    return (
      paymentInfo &&
      translate(
        'screens/swap',
        'Send the selected amount to the address below. This address can be used multiple times, it is always the same for swaps from {{sourceChain}} to {{asset}} on {{targetChain}}.',
        {
          sourceChain: toString(paymentInfo.sourceAsset.blockchain),
          targetChain: toString(paymentInfo.targetAsset.blockchain),
          asset: paymentInfo.targetAsset.name,
        },
      )
    );
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
    navigate('/connect', { setRedirect: true });
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
    <Layout title={translate('navigation/links', 'Swap')} textStart rootRef={rootRef}>
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
          {sourceAssets && targetAssets && (
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
                      items={sourceAssets}
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
                        items={targetAssets}
                        labelFunc={(item) => item.name}
                        balanceFunc={findBalanceString}
                        assetIconFunc={(item) => item.name as AssetIconVariant}
                        descriptionFunc={(item) => item.description}
                        filterFunc={(item: Asset, search?: string | undefined) =>
                          !search || item.name.toLowerCase().includes(search.toLowerCase())
                        }
                        hideBalanceWhenClosed
                        full
                      />
                    </div>
                  </div>
                </StyledHorizontalStack>

                {!hideTargetSelection && (
                  <StyledDropdown<Address>
                    rootRef={rootRef}
                    name="address"
                    items={addressItems}
                    labelFunc={(item) => blankedAddress(item.address, { width })}
                    descriptionFunc={(item) => item.label}
                    full
                    forceEnable
                  />
                )}
              </StyledVerticalStack>

              {isLoading ? (
                <StyledVerticalStack center>
                  <StyledLoadingSpinner size={SpinnerSize.LG} />
                </StyledVerticalStack>
              ) : (
                <>
                  {kycError && !customAmountError && <KycHint type={TransactionType.SWAP} error={kycError} />}

                  {errorMessage && (
                    <StyledVerticalStack center className="text-center">
                      <ErrorHint message={errorMessage} />

                      <StyledButton
                        width={StyledButtonWidth.MIN}
                        label={translate('general/actions', 'Retry')}
                        onClick={() => setVal('amount', enteredAmount)} // re-trigger
                        className="mt-4"
                        color={StyledButtonColor.STURDY_WHITE}
                      />
                    </StyledVerticalStack>
                  )}

                  {paymentInfo && !kycError && !errorMessage && !customAmountError?.hideInfos && (
                    <>
                      <ExchangeRate
                        exchangeRate={paymentInfo.exchangeRate}
                        rate={paymentInfo.rate}
                        fees={paymentInfo.fees}
                        feeCurrency={paymentInfo.sourceAsset}
                        from={paymentInfo.sourceAsset}
                        to={paymentInfo.targetAsset}
                        steps={paymentInfo.priceSteps}
                        amountIn={paymentInfo.amount}
                        amountOut={paymentInfo.estimatedAmount}
                        type="buy"
                      />

                      <PaymentInformationContent info={paymentInfo} infoText={getPaymentInfoString(paymentInfo)} />

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
                          className="mt-4"
                          isLoading={isProcessing}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </StyledVerticalStack>
          )}
        </Form>
      )}
    </Layout>
  );
}
