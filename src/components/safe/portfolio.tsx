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
import { useSettingsContext } from 'src/contexts/settings.context';
import { CustodyAssetBalance, FiatCurrency } from 'src/hooks/safe.hook';
import { formatCurrency } from 'src/util/utils';

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
                  custodyAsset.value[currency],
                  2,
                  2,
                )} ${currency.toUpperCase()}`}</div>
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
