import { AssetIconVariant } from '@dfx.swiss/react-components';

// The Safe holds interest-bearing saving positions that mirror an underlying asset. They carry no
// icon of their own, so DfxAssetIcon would render its grey placeholder — show the icon of the asset
// the position represents instead.
const ASSET_ICON_ALIASES: Record<string, AssetIconVariant> = {
  sZCHF: AssetIconVariant.ZCHF,
};

// Asset names match the icon variants one to one, apart from the aliases above.
export function assetIconVariant(assetName: string): AssetIconVariant {
  return ASSET_ICON_ALIASES[assetName] ?? (assetName as AssetIconVariant);
}
