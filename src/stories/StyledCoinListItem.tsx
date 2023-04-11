import { Asset } from '../api/definitions/asset';
import { Protocol } from '../hooks/blockchain.hook';
import DfxAssetIcon, { AssetIconVariant } from './DfxAssetIcon';

export interface StyledCoinListItemProps {
  asset: Asset;
  disabled?: boolean;
  onClick: () => void;
  protocol: Protocol;
}

export default function StyledCoinListItem({ asset, onClick, protocol, disabled }: StyledCoinListItemProps) {
  const name = asset.comingSoon ? 'Coming soon' : asset.description;
  let buttonClasses = 'flex gap-2 rounded px-3 py-2 h-12';

  disabled || asset.comingSoon
    ? null
    : (buttonClasses += ' hover:bg-dfxGray-400/50 focus:bg-dfxGray-400/50 active:bg-dfxGray-400/80');

  return (
    <button type="button" onClick={onClick} className={buttonClasses} disabled={disabled || asset.comingSoon}>
      <div className="self-center">
        <DfxAssetIcon asset={asset.name as AssetIconVariant} disabled={asset.comingSoon} />
      </div>
      <div className="flex-col text-dfxBlue-800 text-left">
        <div className="flex font-semibold gap-1 ">
          <h4 className="leading-none">{asset.name}</h4>
          <span className="self-start leading-none text-2xs shrink-0">{protocol}</span>{' '}
        </div>
        <span className="text-dfxGray-800 text-xs leading-none relative -top-1">{name}</span>
      </div>
    </button>
  );
}
