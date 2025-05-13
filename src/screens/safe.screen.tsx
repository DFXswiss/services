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
import { useRef } from 'react';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { CustodyAssetBalance, FiatCurrency, useSafe } from 'src/hooks/safe.hook';
import { formatCurrency } from 'src/util/utils';
import { Layout } from '../components/layout';

export default function SafeScreen(): JSX.Element {
  useUserGuard('/login');

  const { translate } = useSettingsContext();
  const { error, isInitialized, isLoading, currency, portfolio, totalValue } = useSafe();
  const rootRef = useRef<HTMLDivElement>(null);

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
                  <p className="text-dfxGray-700 text-left">{translate('screens/safe', 'Total portfolio value')}</p>
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
                  <div className="text-sm text-dfxGray-700">{custodyAsset.asset.description}</div>
                </div>
              </div>
              <div className="text-base text-right w-full flex flex-col font-semibold leading-none gap-1 pb-1 pr-1">
                {formatCurrency(custodyAsset.balance, 0, 5)}
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
