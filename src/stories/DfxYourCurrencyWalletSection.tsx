import { Asset } from '../api/definitions/asset';
import { Fiat } from '../api/definitions/fiat';
import { Protocol } from '../hooks/blockchain.hook';
import DfxIcon, { IconColors, IconSizes, IconVariant } from './DfxIcon';
import StyledDropdown from './form/StyledDropdown';
import StyledCoinListItem from './StyledCoinListItem';

interface DfxYourCurrencyWalletSectionProps {
  currencies: Fiat[];
  currencyElementName: string;
  asset: Asset;
  assetProtocol: Protocol;
  onAssetClick: () => void;
}

export default function DfxYourCurrencyWalletSection({
  currencies,
  currencyElementName,
  asset,
  assetProtocol,
  onAssetClick,
}: DfxYourCurrencyWalletSectionProps) {
  return (
    <div className="flex justify-between  items-center">
      <div className="basis-5/12 shrink-1">
        <StyledDropdown<Fiat>
          name={currencyElementName}
          label="Your Currency"
          labelIcon={IconVariant.BANK}
          items={currencies}
          labelFunc={(item) => item.name}
          descriptionFunc={(item) => 'todo ' + item.name}
        />
      </div>
      <div className="basis-2/12 shrink-0 flex justify-center pt-9">
        <div className=" ">
          <DfxIcon icon={IconVariant.ARROW_RIGHT} size={IconSizes.LG} color={IconColors.GRAY} />
        </div>
      </div>
      <div className="basis-5/12 shrink-1">
        <div className="flex ml-3.5 mb-2.5">
          <DfxIcon icon={IconVariant.WALLET} size={IconSizes.SM} color={IconColors.BLUE} />

          <label className="text-dfxBlue-800 text-base font-semibold pl-3.5">Your Wallet</label>
        </div>
        <div className="border border-dfxGray-400 rounded px-2 py-1.5 drop-shadow-sm">
          <StyledCoinListItem asset={asset} protocol={assetProtocol} onClick={onAssetClick} disabled={true} />
        </div>
      </div>
    </div>
  );
}
