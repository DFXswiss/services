import { Blockchain, Language } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { FeatureTree } from '../config/feature-tree';
import { AppParams, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType } from '../contexts/wallet.context';
import { useAppParams } from './app-params.hook';

// --- INTERFACES --- //
export interface Page {
  id: string;
  dfxStyle?: boolean;
  header?: string;
  description?: string;
  bottomImage?: string;
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
  getPage: (pageId?: string, allowedTiles?: string[]) => Page | undefined;
  getWallet: (tile: WalletTile, params: AppParams) => Wallet;
  setOptions: (options: Options) => void;
}

export function useFeatureTree(): FeatureTreeInterface {
  const { language } = useSettingsContext();
  const { setParams } = useAppParams();
  const { setRedirectPath } = useAppHandlingContext();

  function getPage(pageId?: string, allowedTiles?: string[]): Page | undefined {
    if (!language) return;

    const nextPage = FeatureTree.find((p) => p.id === pageId) ?? FeatureTree[0];
    const tiles = nextPage.tiles
      .map((t) => ({ ...t, img: getImgUrl(t, language) }))
      .filter((t) => !allowedTiles || allowedTiles.includes(t.id));
    return { ...nextPage, tiles };
  }

  function getWallet(tile: WalletTile, params: AppParams): Wallet {
    return typeof tile.wallet === 'function' ? tile.wallet(params) : tile.wallet;
  }

  function getImgUrl(tile: BaseTile, lang: Language): string {
    return `https://content.dfx.swiss/img/v1/services/${tile.img}_${lang.symbol.toLowerCase()}.png`;
  }

  function setOptions(options: Options) {
    // service
    if (options.service) setRedirectPath(`/${options.service}`);

    // query
    if (options.query) {
      setParams(options.query);
    }
  }

  return useMemo(() => ({ getPage, getWallet, setOptions }), [language, setParams]);
}
