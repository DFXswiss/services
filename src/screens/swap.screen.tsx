import {
  ApiError,
  Asset,
  AssetCategory,
  Blockchain,
  Session,
  Swap,
  SwapPaymentInfo,
  TransactionError,
  TransactionType,
  UserAddress,
  Utils,
  Validations,
  useAsset,
  useAssetContext,
  useAuthContext,
  useSessionContext,
  useSwap,
} from '@dfx.swiss/react';
import {
  AssetIconVariant,
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { FieldPath, FieldPathValue, useForm, useWatch } from 'react-hook-form';
import { AddressSelector } from 'src/components/order/address-selector';
import { BlockchainSelector } from 'src/components/order/blockchain-selector';
import { PaymentInformationContent } from 'src/components/payment/payment-info-sell';
import { PrivateAssetHint } from 'src/components/private-asset-hint';
import { addressLabel } from '../config/labels';
import { useLayoutContext } from 'src/contexts/layout.context';
import useDebounce from 'src/hooks/debounce.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { ErrorHint } from '../components/error-hint';
import { ExchangeRate } from '../components/exchange-rate';
import { AddressSwitch } from '../components/payment/address-switch';
import { SwapCompletion } from '../components/payment/swap-completion';
import { QuoteErrorHint } from '../components/quote-error-hint';
import { SanctionHint } from '../components/sanction-hint';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { AssetBalance } from '../contexts/balance.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useAppParams } from '../hooks/app-params.hook';
import { useAddressGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
// import { useTxHelper } from '../hooks/tx-helper.hook';

enum Side {
  SPEND = 'SPEND',
  GET = 'GET',
}

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

interface FormData {
  sourceAsset: Asset;
  targetAsset: Asset;
  amount: string;
  targetAmount: string;
  blockchain: Blockchain;
  address: Address;
}

interface CustomAmountError {
  key: string;
  defaultValue: string;
  interpolation?: Record<string, string | number> | undefined;
  hideInfos: boolean;
}

interface ValidatedData extends SwapPaymentInfo {
  sideToUpdate?: Side;
}

export default function SwapScreen(): JSX.Element {
  useAddressGuard('/login');

  const { translate, translateError } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const { blockchain: walletBlockchain, activeWallet, switchBlockchain } = useWalletContext();
  // const { getBalances, sendTransaction, canSendTransaction } = useTxHelper();
  const getBalances = () => Promise.resolve(undefined);
  const sendTransaction = () => Promise.resolve('test-tx');
  const canSendTransaction = () => false;
  const { availableBlockchains, logout } = useSessionContext();
  const { session } = useAuthContext();
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
    flags,
    setParams,
  } = useAppParams();
  const { receiveFor } = useSwap();
  const { rootRef } = useLayoutContext();

  const [sourceAssets, setSourceAssets] = useState<Asset[]>();
  const [targetAssets, setTargetAssets] = useState<Asset[]>();
  const [customAmountError, setCustomAmountError] = useState<CustomAmountError>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [kycError, setKycError] = useState<TransactionError>();
  const [isLoading, setIsLoading] = useState<Side>();
  const [paymentInfo, setPaymentInfo] = useState<Swap>();
  const [balances, setBalances] = useState<AssetBalance[]>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTxDone, setTxDone] = useState<boolean>(false);
  const [swapTxId, setSwapTxId] = useState<string>();
  const [showsSwitchScreen, setShowsSwitchScreen] = useState(false);
  const [validatedData, setValidatedData] = useState<ValidatedData>();

  // form
  const { control, handleSubmit, setValue, resetField } = useForm<FormData>({ mode: 'onTouched' });

  const enteredAmount = useWatch({ control, name: 'amount' });
  const selectedSourceAsset = useWatch({ control, name: 'sourceAsset' });
  const selectedTargetAmount = useWatch({ control, name: 'targetAmount' });
  const selectedTargetAsset = useWatch({ control, name: 'targetAsset' });
  const selectedBlockchain = useWatch({ control, name: 'blockchain' });
  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (sourceAssets && selectedAddress?.address) {
      // getBalances(sourceAssets, selectedAddress.address, selectedAddress?.chain).then(setBalances);
      console.log('getBalances disabled temporarily');
    }
  }, [sourceAssets]);

  // default params
  function setVal(field: FieldPath<FormData>, value: FieldPathValue<FormData, FieldPath<FormData>>) {
    setValue(field, value, { shouldValidate: true });
  }

  const availableBalance = selectedSourceAsset && findBalance(selectedSourceAsset);

  const filteredAssets = assets && filterAssets(Array.from(assets.values()).flat(), assetFilter);
  const sourceBlockchains = availableBlockchains?.filter((b) => {
    if (!b || typeof b !== 'string' || b === Blockchain.MONERO) return false;
    return filteredAssets?.some((a) => a?.blockchain === b);
  });

  const targetBlockchains = availableBlockchains?.filter((b) => {
    if (!b || typeof b !== 'string') return false;
    return filteredAssets?.some((a) => a?.blockchain === b);
  }) ?? [];


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

  useEffect(() => setBlockchainAndAddress(), [session?.address, translate]);

  useEffect(() => {
    if (selectedAddress && selectedAddress.address === 'Switch address') {
      setShowsSwitchScreen(true);
      setBlockchainAndAddress();
    }
  }, [selectedAddress]);

  useEffect(() => {
    if (selectedBlockchain && selectedBlockchain !== blockchain) {
      setParams({ blockchain: selectedBlockchain });
      switchBlockchain(selectedBlockchain);
      resetField('targetAsset');
      setTargetAssets(undefined);
    }
  }, [selectedBlockchain]);

  useEffect(() => {
    if (!enteredAmount) {
      setCustomAmountError(undefined);
    }
  }, [enteredAmount]);

  // SPEND data changed
  useEffect(() => {
    const requiresUpdate =
      enteredAmount !== paymentInfo?.amount?.toString() ||
      selectedSourceAsset?.uniqueName !== paymentInfo?.sourceAsset.uniqueName;

    const hasSpendData = enteredAmount && selectedSourceAsset;
    const hasGetData = selectedTargetAmount && selectedTargetAsset && selectedAddress;

    if (requiresUpdate) {
      if (hasSpendData) {
        updateData(Side.GET);
      } else if (hasGetData) {
        updateData(Side.SPEND);
      }
    }
  }, [enteredAmount, selectedSourceAsset]);

  // GET data changed
  useEffect(() => {
    const isSameTargetAmount = selectedTargetAmount === paymentInfo?.estimatedAmount?.toString();
    const requiresUpdate =
      !isSameTargetAmount || selectedTargetAsset?.uniqueName !== paymentInfo?.targetAsset?.uniqueName;

    const hasSpendData = enteredAmount && selectedSourceAsset;
    const hasGetData = selectedTargetAmount && selectedTargetAsset && selectedAddress;

    if (requiresUpdate) {
      if (hasGetData) {
        updateData(Side.SPEND);
      } else if (hasSpendData) {
        updateData(Side.GET);
      }
    }
  }, [selectedTargetAmount, selectedTargetAsset]);

  function updateData(sideToUpdate: Side) {
    const data = validateData({
      amount: sideToUpdate === Side.GET ? enteredAmount : undefined,
      sourceAsset: selectedSourceAsset,
      targetAsset: selectedTargetAsset,
      targetAmount: sideToUpdate === Side.SPEND || enteredAmount === undefined ? selectedTargetAmount : undefined,
      address: selectedAddress,
    });

    data && setValidatedData({ ...data, sideToUpdate });
  }

  useEffect(() => {
    let isRunning = true;

    setErrorMessage(undefined);
    setPaymentInfo(undefined);
    setIsLoading(undefined);

    if (!validatedData) return;

    const data: SwapPaymentInfo = { ...validatedData, externalTransactionId };

    setIsLoading(validatedData.sideToUpdate);
    receiveFor(data)
      .then((swap) => {
        if (isRunning) {
          validateSwap(swap);
          setPaymentInfo(swap);

          // load exact price
          if (swap) {
            return receiveFor({ ...data, exactPrice: true });
          }
        }
      })
      .then((info) => {
        if (isRunning && info) {
          validatedData.sideToUpdate === Side.SPEND
            ? setVal('amount', info.amount.toString())
            : setVal('targetAmount', info.estimatedAmount.toString());
          setPaymentInfo(info);
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
      .finally(() => isRunning && setIsLoading(undefined));

    return () => {
      isRunning = false;
    };
  }, [useDebounce(validatedData, 500)]);

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
      case TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING:
      case TransactionError.VIDEO_IDENT_REQUIRED:
      case TransactionError.NATIONALITY_NOT_ALLOWED:
      case TransactionError.IBAN_CURRENCY_MISMATCH:
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

  function validateData({
    amount: amountStr,
    sourceAsset,
    targetAsset,
    targetAmount: targetAmountStr,
    address,
  }: Partial<FormData> = {}): SwapPaymentInfo | undefined {
    const amount = Number(amountStr);
    const targetAmount = Number(targetAmountStr);
    if (sourceAsset != null && targetAsset != null && address != null) {
      return amount > 0
        ? { amount, sourceAsset, targetAsset, receiverAddress: address.address }
        : targetAmount > 0
        ? { sourceAsset, targetAsset, targetAmount, receiverAddress: address.address }
        : undefined;
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
          sourceChain: paymentInfo.sourceAsset.blockchain || 'blockchain',
          targetChain: paymentInfo.targetAsset.blockchain || 'blockchain',
          asset: paymentInfo.targetAsset.name,
        },
      )
    );
  }

  function onSubmit(_data: FormData) {
    // TODO: (Krysh fix broken form validation and onSubmit
  }

  function setBlockchainAndAddress() {
    if (session?.address && targetBlockchains) {
      const defaultBlockchain = blockchain ? targetBlockchains.find(b => b === blockchain) || targetBlockchains[0] : targetBlockchains[0];
      if (defaultBlockchain) {
        setVal('blockchain', defaultBlockchain);
        
        // Set current address as default
        const currentAddress = {
          address: addressLabel(session),
          label: 'Current address',
          chain: defaultBlockchain,
        };
        setVal('address', currentAddress);
      }
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
      // if (canSendTransaction()) await sendTransaction(paymentInfo).then(setSwapTxId);
      console.log('sendTransaction disabled temporarily');

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

  useLayoutOptions({ title: translate('navigation/links', 'Swap'), textStart: true });

  return (
    <>
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
                        (kycError &&
                          [
                            TransactionError.BANK_TRANSACTION_MISSING,
                            TransactionError.BANK_TRANSACTION_OR_VIDEO_MISSING,
                          ].includes(kycError)) ||
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
                      placeholder={translate('general/actions', 'Select') + '...'}
                      items={sourceAssets.sort((a, b) => {
                        const balanceA = findBalance(a) || 0;
                        const balanceB = findBalance(b) || 0;
                        return balanceB - balanceA;
                      })}
                      labelFunc={(item) => item.name}
                      descriptionFunc={(item) => item.blockchain}
                      balanceFunc={findBalanceString}
                      assetIconFunc={(item) => item.name as AssetIconVariant}
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
                <h2 className="text-dfxGray-700">
                  {translate('screens/buy', paymentInfo?.rate === 1 ? 'You get' : 'You get about')}
                </h2>

                <StyledHorizontalStack gap={1}>
                  <div className="flex-[3_1_9rem]">
                    <StyledInput
                      type="number"
                      name="targetAmount"
                      loading={isLoading === Side.GET}
                      disabled={isLoading === Side.GET}
                      full
                    />
                  </div>
                  <div className="flex-[1_0_9rem]">
                    <div className="flex-[1_0_9rem]">
                      <StyledSearchDropdown<Asset>
                        rootRef={rootRef}
                        name="targetAsset"
                        placeholder={translate('general/actions', 'Select') + '...'}
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
                  <StyledHorizontalStack gap={1}>
                    <div className="flex-[3_1_9rem] min-w-0">
                      <AddressSelector control={control} name="address" selectedBlockchain={selectedBlockchain} />
                    </div>
                    <div className="flex-[1_0_9rem] min-w-0">
                      <BlockchainSelector control={control} name="blockchain" availableBlockchains={targetBlockchains ?? []} selectedBlockchain={selectedBlockchain} />
                    </div>
                  </StyledHorizontalStack>
                )}
              </StyledVerticalStack>

              {isLoading ? (
                <StyledVerticalStack center>
                  <StyledLoadingSpinner size={SpinnerSize.LG} />
                </StyledVerticalStack>
              ) : (
                <>
                  {kycError && !customAmountError && <QuoteErrorHint type={TransactionType.SWAP} error={kycError} />}

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

                  {paymentInfo &&
                    !kycError &&
                    !errorMessage &&
                    !customAmountError?.hideInfos &&
                    ((selectedSourceAsset?.category === AssetCategory.PRIVATE ||
                      selectedTargetAsset?.category === AssetCategory.PRIVATE) &&
                    !flags?.includes('private') ? (
                      <PrivateAssetHint
                        asset={
                          selectedSourceAsset?.category === AssetCategory.PRIVATE
                            ? selectedSourceAsset
                            : selectedTargetAsset
                        }
                      />
                    ) : (
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
                          type={TransactionType.SWAP}
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
                    ))}
                </>
              )}
            </StyledVerticalStack>
          )}
        </Form>
      )}
    </>
  );
}
