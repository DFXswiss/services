import { ApiError, Fiat, useApi, User, useSessionContext, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  AssetIconSize,
  AssetIconVariant,
  DfxAssetIcon,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { formatCurrency } from 'src/util/utils';
import { Layout } from '../components/layout';

enum FiatCurrency {
  CHF = 'CHF',
  EUR = 'EUR',
  USD = 'USD',
}

interface CustodyAsset {
  name: string;
  description: string;
}

interface CustodyAssetBalance {
  asset: CustodyAsset;
  balance: number;
  value: number;
}

interface CustodyBalance {
  totalValue: number;
  currency: Fiat;
  balances: CustodyAssetBalance[];
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.CHF);
  const [portfolio, setPortfolio] = useState<CustodyAssetBalance[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);

  useEffect(() => {
    if (!isUserLoading && user && isLoggedIn) {
      createAccountIfRequired(user)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
        .finally(() => setIsInitialized(true));
    }
  }, [isUserLoading, user, isLoggedIn]);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    call<CustodyBalance>({
      url: `custody`,
      method: 'GET',
    })
      .then(({ balances, currency, totalValue }) => {
        setPortfolio(balances);
        setCurrency(currency.name as FiatCurrency);
        setTotalValue(totalValue);
      })
      .catch((error: ApiError) => {
        setError(error.message ?? 'Unknown error');
      })
      .finally(() => setIsLoading(false));
  }, [user]);

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
    <Layout rootRef={rootRef} title={translate('screens/safe', 'My DFX Safe')}>
      {error ? (
        <div>
          <ErrorHint message={error} />
        </div>
      ) : !isInitialized ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="flex flex-col w-full gap-2">
          <div className="shadow-card rounded-xl">
            <div id="chart-timeline" className="relative">
              <div className="p-2 gap-2 flex flex-col items-start">
                <div className="w-full flex-col">
                  <h2 className="text-dfxBlue-800 text-left">{translate('screens/safe', 'Portfolio')}</h2>
                  <p className="text-dfxGray-700 text-left">Total portfolio value</p>
                </div>
                <div className="flex flex-row items-center gap-2">
                  {isLoading ? (
                    <div className="leading-none">
                      <StyledLoadingSpinner size={SpinnerSize.MD} />
                    </div>
                  ) : (
                    <div className="text-dfxBlue-800">
                      <span className="text-lg font-bold leading-tight">{formatCurrency(totalValue, 2, 2)}</span>{' '}
                      <span className="text-base font-[350] leading-tight">{currency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <Portfolio portfolio={portfolio} currency={currency} isLoading={isLoading} />
        </div>
      )}
    </Layout>
  );
}

/**
 * ***********************************************
 *               PORTFOLIO COMPONENT
 * ***********************************************
 */

interface PortfolioProps {
  portfolio: CustodyAssetBalance[];
  currency: FiatCurrency;
  isLoading: boolean;
}

export const Portfolio = ({ portfolio, currency, isLoading }: PortfolioProps) => {
  const { translate } = useSettingsContext();

  return isLoading ? (
    <div className="w-full flex flex-col items-center justify-center gap-2 p-4">
      <StyledLoadingSpinner size={SpinnerSize.LG} />
    </div>
  ) : portfolio?.length ? (
    <StyledVerticalStack full gap={2}>
      <StyledDataTable alignContent={AlignContent.BETWEEN}>
        {portfolio.map((custodyAsset: CustodyAssetBalance) => (
          <StyledDataTableRow key={custodyAsset.asset.name}>
            <div className="w-full flex flex-row justify-between items-center gap-2 text-dfxBlue-800 p-2">
              <div className="w-full flex flex-row items-center gap-3">
                <DfxAssetIcon asset={custodyAsset.asset.name as AssetIconVariant} size={AssetIconSize.LG} />
                <div className="text-base flex flex-col font-semibold text-left leading-none gap-1 pb-1">
                  {custodyAsset.asset.name}
                  <div className="text-sm text-dfxGray-700">{custodyAsset.asset.name}</div>
                </div>
              </div>
              <div className="text-base text-right w-full flex flex-col font-semibold leading-none gap-1 pb-1 pr-1">
                {custodyAsset.balance}
                <div className="text-sm text-dfxGray-700">{`${formatCurrency(
                  custodyAsset.value,
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
