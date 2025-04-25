import {
  ApiError,
  Asset,
  BankAccount,
  Blockchain,
  Fiat,
  FiatPaymentMethod,
  useApi,
  useAsset,
  useAssetContext,
  useBankAccount,
  useBankAccountContext,
  useBuy,
  useFiat,
  User,
  useSessionContext,
  useUserContext,
  Utils,
  Validations,
} from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconSize,
  AssetIconVariant,
  DfxAssetIcon,
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledBankAccountListItem,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledHorizontalStack,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { AssetCategory } from '@dfx.swiss/react/dist/definitions/asset';
import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'react-apexcharts';
import { Controller, Noop, useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
import { AssetDropdown, StyledAssetInput } from 'src/components/StyledAssetInput';
import { PaymentMethodDescriptions, PaymentMethodLabels } from 'src/config/labels';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { useUserGuard } from 'src/hooks/guard.hook';
import { formatCurrency } from 'src/util/utils';
import { Layout } from '../components/layout';

enum FiatCurrency {
  CHF = 'CHF',
  EUR = 'EUR',
  USD = 'USD',
}

const portfolioStats = {
  value: {
    CHF: 2239239.0,
    EUR: 2539000.0,
    USD: 2710392.0,
  },
};

// Dummy data
const portfolio: AssetData[] = generateAssetData();

const EmbeddedWallet = 'CakeWallet';

export default function SafeScreen(): JSX.Element {
  useUserGuard('/login');

  const { call } = useApi();
  const { user, isUserLoading } = useUserContext();
  const { isLoggedIn } = useSessionContext();
  const { setSession } = useWalletContext();
  const { translate } = useSettingsContext();
  const rootRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);

  useEffect(() => {
    if (!isUserLoading && user && isLoggedIn) {
      createAccountIfRequired(user)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn]);

  async function createAccountIfRequired(user: User): Promise<void> {
    if (!user.addresses.some((a) => a.isCustody)) {
      return call<{ accessToken: string }>({
        url: 'custody',
        method: 'POST',
        data: {
          addressType: 'EVM',
        },
      }).then(({ accessToken }) => setSession(accessToken));
    }
  }

  return (
    <Layout rootRef={rootRef}>
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
              <div className="absolute p-4 gap-2 flex flex-col items-start">
                <div className="w-full flex-col">
                  <h2 className="text-dfxBlue-800 text-left">{translate('screens/safe', 'My Safe')}</h2>
                  <p className="text-dfxGray-700 text-left">Total portfolio value</p>
                </div>
                <div className="flex flex-row items-center gap-2">
                  <div className="z-10 w-min bg-white/80 rounded-md overflow-clip flex flex-row justify-center items-center">
                    {Object.values(FiatCurrency).map((_currency) => (
                      <SegmentedControlButton
                        selected={_currency === currency}
                        size={'sm'}
                        onClick={() => setCurrency(_currency)}
                      >
                        {_currency}
                      </SegmentedControlButton>
                    ))}
                  </div>
                  <div className="text-dfxBlue-800">
                    <span className="text-base font-bold leading-tight">
                      {formatCurrency(portfolioStats.value[currency], 2, 2)}
                    </span>{' '}
                    <span className="text-base font-[350] leading-tight">{currency}</span>
                  </div>
                </div>
              </div>
              <PriceChart />
            </div>
          </div>
          <Portfolio portfolio={portfolio} currency={currency} />
          <div className="h-[1px] bg-dfxGray-500 w-full rounded-full" />
          <DepositWithdraw />
        </div>
      )}
    </Layout>
  );
}

/**
 * ***********************************************
 *           DEPOSIT / WITHDRAW COMPONENT
 * ***********************************************
 */
interface FormData {
  amount: string;
  targetAmount: string;
  currency: Fiat;
  asset: Asset;
  paymentMethod: FiatPaymentMethod;
  bankAccount: BankAccount;
}

interface AssetData {
  blockchain: Blockchain;
  name: string;
  description: string;
  uniqueName: string;
  amount: number;
  value: {
    CHF: number;
    EUR: number;
    USD: number;
  };
  icon: AssetIconVariant;
  limits: {
    minVolume: number;
    maxVolume: number;
  };
}

enum Side {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export const DepositWithdraw = () => {
  const [bankSelectionVisible, setBankSelectionVisible] = useState(false);
  const { allowedCountries, translate, translateError, currency: prefCurrency } = useSettingsContext();
  const { toDescription, getDefaultCurrency } = useFiat();
  const { getAssets } = useAssetContext();
  const { blockchain: walletBlockchain } = useWalletContext();
  const { bankAccounts, createAccount, updateAccount } = useBankAccountContext();
  const { getAccount } = useBankAccount();
  const { getAsset, isSameAsset } = useAsset();
  const { currencies } = useBuy();
  const { user } = useUserContext();
  const {
    assets: assetFilter,
    assetOut,
    amountOut,
    blockchain,
    availableBlockchains,
    wallet,
    bankAccount,
  } = useAppParams();
  const { isEmbedded, isDfxHosted } = useAppHandlingContext();
  const rootRef = useRef<HTMLDivElement>(null);

  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [availableBalance, setAvailableBalance] = useState<string>();
  const [bankAccountSelection, setBankAccountSelection] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const [side, setSide] = useState<Side>(Side.DEPOSIT);

  const availablePaymentMethods = [FiatPaymentMethod.BANK];

  const {
    control,
    setValue,
    resetField,
    formState: { errors, isValid },
  } = useForm<FormData>({ mode: 'onTouched' });

  const selectedAsset = useWatch({ control, name: 'asset' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const selectedPaymentMethod = useWatch({ control, name: 'paymentMethod' });
  const selectedBankAccount = useWatch({ control, name: 'bankAccount' });

  (isDfxHosted || !isEmbedded) &&
    wallet !== EmbeddedWallet &&
    user?.activeAddress?.wallet !== EmbeddedWallet &&
    (!selectedAsset || selectedAsset?.cardBuyable) &&
    availablePaymentMethods.push(FiatPaymentMethod.CARD);

  const availableCurrencies = currencies?.filter((c) =>
    selectedPaymentMethod === FiatPaymentMethod.CARD
      ? c.cardSellable
      : selectedPaymentMethod === FiatPaymentMethod.INSTANT
      ? c.instantSellable
      : c.sellable,
  );

  useEffect(() => {
    const activeBlockchain = walletBlockchain ?? blockchain;
    const activeBlockchains = activeBlockchain ? [activeBlockchain as Blockchain] : availableBlockchains ?? [];
    const blockchainAssets = getAssets(activeBlockchains, { buyable: true, comingSoon: false }).filter(
      (a) => a.category === AssetCategory.PUBLIC || a.name === assetOut,
    );
    const activeAssets = filterAssets(blockchainAssets, assetFilter);
    if (activeAssets.length === 0) return;
    console.log('activeAssets', activeAssets);

    setAvailableAssets(activeAssets);
    const presetAsset =
      getAsset(activeAssets, assetOut) ??
      (portfolio.length > 0 && getAsset(activeAssets, portfolio[0].name)) ??
      (activeAssets.length > 0 && activeAssets[0]);
    if (presetAsset) setValue('asset', presetAsset);
  }, [assetOut, assetFilter, getAsset, getAssets, blockchain, walletBlockchain, availableBlockchains]);

  useEffect(() => {
    amountOut && setValue('amount', amountOut);
  }, [amountOut]);

  useEffect(() => {
    const availableBalance = amountOut ?? portfolio.find((a) => a.name === selectedAsset?.name)?.amount?.toString();
    availableBalance && setAvailableBalance(availableBalance);
  }, [selectedAsset]);

  useEffect(() => {
    if (selectedCurrency) return;
    const defaultCurrency = getDefaultCurrency(availableCurrencies);
    const currency = defaultCurrency ?? (availableCurrencies && availableCurrencies[0]);
    currency && setValue('currency', currency);
  }, [availableCurrencies]);

  useEffect(() => {
    if (bankAccount && bankAccounts) {
      const account = getAccount(bankAccounts, bankAccount);
      if (account) {
        setValue('bankAccount', account);
      } else if (!isCreatingAccount && Validations.Iban(allowedCountries).validate(bankAccount) === true) {
        setIsCreatingAccount(true);
        createAccount({ iban: bankAccount })
          .then((b) => setValue('bankAccount', b))
          .finally(() => setIsCreatingAccount(false));
      }
    }
  }, [side, bankAccount, getAccount, bankAccounts, allowedCountries]);

  useEffect(() => {
    if (side === Side.DEPOSIT) {
      setBankAccountSelection(false);
      setValue('paymentMethod', availablePaymentMethods[0]);
      resetField('bankAccount');
    } else {
      resetField('paymentMethod');
    }
  }, [side, availablePaymentMethods, setValue, resetField]);

  function filterAssets(assets: Asset[], filter?: string): Asset[] {
    if (!filter) return assets;

    const allowedAssets = filter.split(',');
    return assets.filter((a) => allowedAssets.some((f) => isSameAsset(a, f)));
  }

  const rules = Utils.createRules({
    asset: Validations.Required,
    currency: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} hasFormElement={false}>
      <StyledVerticalStack gap={2} full center>
        <StyledVerticalStack
          gap={2}
          full
          className={`relative text-left ${side === Side.WITHDRAW ? 'flex-col-reverse' : ''}`}
        >
          <StyledHorizontalStack gap={1}>
            <StyledAssetInput
              type="number"
              name="amount"
              label="You spend"
              placeholder="0.00"
              maxButtonClick={() => availableBalance && setValue('amount', `${availableBalance}`)}
              fiatRate={1 + Math.random()} // TODO
              fiatCurrency={selectedCurrency?.name}
              assetSelector={
                <AssetDropdown<Fiat>
                  control={control}
                  name="currency"
                  items={availableCurrencies ?? []}
                  labelFunc={(item) => item.name}
                  descriptionFunc={(item) => toDescription(item)}
                  balanceFunc={(_item) => (Math.random() * 1000).toFixed(2)} // TODO
                  priceFunc={(_item) => (Math.random() * 1000).toFixed(2)} // TODO
                  assetIconFunc={(item) => item.name as AssetIconVariant}
                  showSelectedValue={true}
                />
              }
            />
          </StyledHorizontalStack>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-14 w-14">
            <button
              type="button"
              className="w-full h-full flex items-center justify-center bg-dfxGray-300 hover:bg-dfxGray-500 rounded-md border-[6px] border-white"
              onClick={() => setSide((prevSide) => (prevSide === Side.DEPOSIT ? Side.WITHDRAW : Side.DEPOSIT))}
            >
              <DfxIcon icon={IconVariant.ARROW_DOWN} size={IconSize.MD} color={IconColor.BLACK} />
            </button>
          </div>
          <StyledHorizontalStack gap={1}>
            <StyledAssetInput
              type="number"
              name="targetAmount"
              label="You get"
              coloredBackground={true}
              placeholder="0.00"
              maxButtonClick={() => availableBalance && setValue('amount', `${availableBalance}`)}
              fiatRate={1 + Math.random()} // TODO
              fiatCurrency={selectedCurrency?.name}
              assetSelector={
                <AssetDropdown<Asset>
                  control={control}
                  name="asset"
                  items={availableAssets}
                  labelFunc={(item) => item.name}
                  descriptionFunc={(item) => item.description}
                  balanceFunc={(_item) => (Math.random() * 1000).toFixed(2)} // TODO
                  priceFunc={(_item) => (Math.random() * 1000).toFixed(2)} // TODO
                  assetIconFunc={(item) => item.name as AssetIconVariant}
                  showSelectedValue={true}
                />
              }
            />
          </StyledHorizontalStack>
        </StyledVerticalStack>
        <div className="flex-1 w-full">
          {side === Side.DEPOSIT ? (
            <StyledDropdown<FiatPaymentMethod>
              rootRef={rootRef}
              name="paymentMethod"
              placeholder={translate('general/actions', 'Select') + '...'}
              items={availablePaymentMethods}
              labelFunc={(item) => translate('screens/payment', PaymentMethodLabels[item])}
              descriptionFunc={(item) => translate('screens/payment', PaymentMethodDescriptions[item])}
              full
            />
          ) : (
            <Controller
              name="bankAccount"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <StyledModalButton
                    onClick={() => setBankAccountSelection(true)}
                    onBlur={onBlur}
                    placeholder={translate('screens/sell', 'Add or select your IBAN')}
                    value={Utils.formatIban(value?.iban) ?? undefined}
                    description={value?.label}
                  />

                  {bankAccountSelection && (
                    <div className="absolute h-full w-full z-10 top-0 left-0 bg-white p-4">
                      <div className="flex flex-row items-center mb-4">
                        <button className="p-2 mr-2" onClick={() => setBankAccountSelection(false)}>
                          <DfxIcon icon={IconVariant.ARROW_LEFT} size={IconSize.MD} color={IconColor.BLACK} />
                        </button>
                        <h2 className="text-lg font-medium">{translate('screens/sell', 'Select payment account')}</h2>
                      </div>

                      {bankAccounts?.length && (
                        <>
                          <StyledVerticalStack gap={4}>
                            {bankAccounts.map((account, i) => (
                              <button
                                key={i}
                                className="text-start"
                                onClick={() => {
                                  onChange(account);
                                  setBankAccountSelection(false);
                                }}
                              >
                                <StyledBankAccountListItem bankAccount={account} />
                              </button>
                            ))}
                          </StyledVerticalStack>

                          <div className={`h-[1px] bg-dfxGray-400 w-full my-6`} />
                        </>
                      )}

                      <AddBankAccount
                        onSubmit={(account) => {
                          onChange(account);
                          setBankAccountSelection(false);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            />
          )}
        </div>
        <div className="w-full">
          <StyledButton
            type="button"
            isLoading={false}
            label={translate('screens/safe', side === Side.DEPOSIT ? 'Deposit' : 'Withdraw')}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            onClick={() => console.log(`${side === Side.DEPOSIT ? 'Deposit' : 'Withdraw'} clicked`)}
          />
        </div>
      </StyledVerticalStack>
    </Form>
  );
};

/***
 * **********************************************************
 *    STYLED MODAL BUTTON COMPONENT (TMP, use from @react)
 * **********************************************************
 */

export interface StyledModalButtonProps {
  label?: string;
  onClick: () => void;
  onBlur: Noop;
  value?: string;
  description?: string;
  placeholder: string;
}

export function StyledModalButton({
  label,
  onClick,
  onBlur,
  value,
  description,
  placeholder,
  ...props
}: StyledModalButtonProps): JSX.Element {
  return (
    <StyledVerticalStack gap={1}>
      {label && <label className="text-dfxBlue-800 text-base font-semibold pl-4 text-start">{label}</label>}
      <button
        type="button"
        className="flex justify-between border border-dfxGray-400 text-base font-normal rounded-md px-4 py-2 shadow-sm w-full h-[58px]"
        onClick={onClick}
        onBlur={onBlur}
        {...props}
      >
        <div className="h-full flex flex-col justify-center text-left gap-1">
          {value ? (
            <>
              {description && <span className="text-dfxGray-800 text-xs h-min leading-none">{description}</span>}
              <span className={'text-dfxBlue-800 leading-none font-base'.concat(description ? '' : ' py-2')}>
                {value}
              </span>
            </>
          ) : (
            <span className="text-dfxGray-600">{placeholder}</span>
          )}
        </div>
        <div className="place-self-center">
          <DfxIcon icon={IconVariant.UNFOLD_MORE} size={IconSize.LG} />
        </div>
      </button>
    </StyledVerticalStack>
  );
}

/**
 * ***********************************************
 *               PORTFOLIO COMPONENT
 * ***********************************************
 */
export const Portfolio = ({ portfolio, currency }: { portfolio: AssetData[]; currency: FiatCurrency }) => {
  const { translate } = useSettingsContext();

  return portfolio?.length ? (
    <StyledVerticalStack full gap={2}>
      <div className="w-full flex flex-col px-4 pb-2 pt-3">
        <h2 className="text-dfxBlue-800 text-left text-lg font-semibold">{translate('screens/safe', 'Portfolio')}</h2>
      </div>
      <StyledDataTable alignContent={AlignContent.BETWEEN}>
        {portfolio.map((asset: AssetData) => (
          <StyledDataTableRow key={asset.name}>
            <div className="w-full flex flex-row justify-between items-center gap-2 text-dfxBlue-800 p-2">
              <div className="w-full flex flex-row items-center gap-3">
                <DfxAssetIcon asset={asset.icon} size={AssetIconSize.LG} />
                <div className="text-base flex flex-col font-semibold text-left leading-none gap-1 pb-1">
                  {asset.name}
                  <div className="text-sm text-dfxGray-700">{asset.name}</div>
                </div>
              </div>
              <div className="text-base text-right w-full flex flex-col font-semibold leading-none gap-1 pb-1 pr-1">
                {asset.amount}
                <div className="text-sm text-dfxGray-700">{`${formatCurrency(
                  asset.value[currency],
                  2,
                  2,
                )} ${currency}`}</div>
              </div>
            </div>
          </StyledDataTableRow>
        ))}
      </StyledDataTable>
    </StyledVerticalStack>
  ) : (
    <div className="w-full flex flex-col items-center justify-center gap-2 p-4">
      <p className="text-dfxBlue-300 text-left">{translate('screens/safe', 'No assets found')}</p>
    </div>
  );
};

/**
 * ***********************************************
 *                 CHART COMPONENT
 * ***********************************************
 */
interface ValueChart {
  id: string;
  lastPrice: string;
  time: string;
}

enum Timeframe {
  WEEK = '1W',
  MONTH = '1M',
  QUARTER = '1Q',
  YEAR = '1Y',
  ALL = 'All',
}

const getStartTimestampByTimeframe = (timeframe: Timeframe) => {
  switch (timeframe) {
    case Timeframe.ALL:
      return 0;
    case Timeframe.WEEK:
      return Date.now() - 7 * 24 * 60 * 60 * 1000;
    case Timeframe.MONTH:
      return Date.now() - 30 * 24 * 60 * 60 * 1000;
    case Timeframe.QUARTER:
      return Date.now() - 90 * 24 * 60 * 60 * 1000;
    case Timeframe.YEAR:
      return Date.now() - 365 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
};

export const PriceChart = () => {
  const trades = generateValueChartData();
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.ALL);
  const startTrades = getStartTimestampByTimeframe(timeframe);

  const filteredTrades = useMemo(
    () =>
      trades.filter((trade) => {
        return parseFloat(trade.time) * 1000 > startTrades;
      }),
    [trades, startTrades],
  );

  const maxPrice = useMemo(
    () => Math.max(...filteredTrades.map((trade) => Math.round(Number(trade.lastPrice) / 10 ** 16) / 100)),
    [filteredTrades],
  );

  return (
    <>
      <Chart
        type="area"
        options={{
          theme: {
            monochrome: {
              color: '#092f62',
              enabled: true,
            },
          },
          chart: {
            type: 'area',
            height: 300,
            dropShadow: {
              enabled: false,
            },
            toolbar: {
              show: false,
            },
            zoom: {
              enabled: false,
            },
            background: '0',
          },
          stroke: {
            width: 3,
          },
          dataLabels: {
            enabled: false,
          },
          grid: {
            show: false,
          },
          xaxis: {
            type: 'datetime',
            labels: {
              show: false,
            },
            axisBorder: {
              show: false,
            },
            axisTicks: {
              show: false,
            },
          },
          yaxis: {
            show: false,
            min: 0,
            max: maxPrice * 1.6,
          },
          fill: {
            type: 'gradient',
            gradient: {
              shadeIntensity: 0,
              opacityTo: 0.0,
              shade: '#e7e7ea',
              gradientToColors: ['#092f62'],
            },
          },
        }}
        series={[
          {
            name: 'Portfolio Value',
            data: filteredTrades.map((trade) => {
              return [parseFloat(trade.time) * 1000, Math.round(Number(trade.lastPrice) / 10 ** 16) / 100];
            }),
          },
        ]}
      />
      <div className="absolute bottom-2.5 w-full flex justify-center py-2">
        <div className="z-10 w-min bg-white/80 rounded-lg overflow-clip flex flex-row justify-center items-center">
          {Object.values(Timeframe).map((_timeframe) => (
            <SegmentedControlButton
              key={_timeframe}
              selected={_timeframe === timeframe}
              onClick={() => setTimeframe(_timeframe)}
            >
              {_timeframe}
            </SegmentedControlButton>
          ))}
        </div>
      </div>
    </>
  );
};

/**
 * ***********************************************
 *         SEGMENTCONTROL BUTTON COMPONENT
 * ***********************************************
 */
interface SegmentedControlButtonProps {
  selected?: boolean;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const SegmentedControlButton = ({ children, selected, size, onClick }: SegmentedControlButtonProps) => {
  const padding = size === 'sm' ? 'px-2.5 py-2' : size === 'lg' ? 'px-4 py-3' : 'px-3 py-2.5';
  return (
    <button
      className={`btn ${padding} leading-none ${
        selected
          ? 'bg-dfxBlue-800/15 text-dfxBlue-800'
          : 'bg-dfxBlue-800/5 text-dfxBlue-800/40  hover:text-dfxBlue-800 hover:bg-dfxBlue-800/15'
      } text-sm font-medium transition-all duration-300`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

/**
 * ***********************************************
 *                UTILITY FUNCTIONS
 * ***********************************************
 */
function generateValueChartData(): ValueChart[] {
  const data: ValueChart[] = [];
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setFullYear(startDate.getFullYear() - 1);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const numPoints = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const step = Math.floor(timeDiff / numPoints);
  let lastPrice = 100000000000000000;

  for (let i = 0; i <= numPoints; i++) {
    const time = new Date(startDate.getTime() + i * step).getTime() / 1000;
    lastPrice *= 1.01;
    data.push({ id: `${i}`, lastPrice: lastPrice.toString(), time: time.toString() });
  }

  return data;
}

function generateAssetData(): AssetData[] {
  return [
    {
      blockchain: Blockchain.ETHEREUM,
      name: 'dEURO',
      description: 'Decentralized EURO',
      uniqueName: 'Ethereum/dEURO',
      amount: 28030.56,
      value: {
        CHF: 0.89,
        EUR: 1.0,
        USD: 1.08,
      },
      icon: AssetIconVariant.dEURO,
      limits: {
        minVolume: 0.10619,
        maxVolume: 1061900000,
      },
    },
    {
      blockchain: Blockchain.ETHEREUM,
      name: 'ZCHF',
      description: '"Frankencoin"',
      uniqueName: 'Ethereum/ZCHF',
      amount: 13902.64,
      value: {
        CHF: 1,
        EUR: 1.06,
        USD: 1.13,
      },
      icon: AssetIconVariant.ZCHF,
      limits: {
        maxVolume: 1000000000,
        minVolume: 0.1,
      },
    },
  ];
}
