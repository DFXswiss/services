import { Blockchain, Language } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { FeatureTree } from '../config/feature-tree';
import { AppParams } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType } from '../contexts/wallet.context';
import { useAppParams } from './app-params.hook';
import { useNavigation } from './navigation.hook';

// --- INTERFACES --- //
export interface Page {
  id: string;
  tiles: Tile[];
}

export type Tile = DefaultTile | DisabledTile | WalletTile;

export interface BaseTile {
  id: string;
  img: string;
  disabled?: boolean;
  next?: Next;
  wallet?: Wallet | WalletSelector;
}

export interface DefaultTile extends BaseTile {
  next: Next;
}

export interface DisabledTile extends BaseTile {
  disabled: true;
}

export interface WalletTile extends BaseTile {
  wallet: Wallet | WalletSelector;
}

export interface Next {
  page: string;
  tiles?: string[];
  options?: Options;
}

export interface Wallet {
  type: WalletType;
  blockchain?: Blockchain;
}

export type WalletSelector = (params: AppParams) => Wallet;

export interface Options {
  service?: string;
  query?: Query;
}

type Query = { [k in keyof AppParams]: string };

export function isWallet(tile: Tile): tile is WalletTile {
  return tile?.wallet != null;
}

// --- HOOK --- //

interface FeatureTreeInterface {
  getTiles: (id?: string) => Tile[] | undefined;
  getWallet: (tile: WalletTile, params: AppParams) => Wallet;
  setOptions: (options: Options) => void;
}

export function useFeatureTree(): FeatureTreeInterface {
  const { language } = useSettingsContext();
  const { setParams } = useAppParams();
  const { setParams: setUrlParams } = useNavigation();

  function getTiles(pageId?: string): Tile[] | undefined {
    if (!language) return;

    return (FeatureTree.find((p) => p.id === pageId) ?? FeatureTree[0]).tiles.map((t) => ({
      ...t,
      img: getImgUrl(t, language),
    }));
  }

  function getWallet(tile: WalletTile, params: AppParams): Wallet {
    return typeof tile.wallet === 'function' ? tile.wallet(params) : tile.wallet;
  }

  function getImgUrl(tile: BaseTile, lang: Language): string {
    return `https://content.dfx.swiss/img/v1/services/${tile.img}_${lang.symbol.toLowerCase()}.png`;
  }

  function setOptions(options: Options) {
    // service
    if (options.service) {
      const params = new URLSearchParams({ 'redirect-path': `/${options.service}` });
      setUrlParams(params);
    }

    // query
    if (options.query) {
      setParams(options.query);
    }
  }

  return useMemo(() => ({ getTiles, getWallet, setOptions }), [language, setParams]);
}
