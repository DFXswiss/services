import { Blockchain, Language } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { FeatureTree } from '../config/feature-tree';
import { AppParams, useParamContext } from '../contexts/param.context';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType } from '../contexts/wallet.context';
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
  wallet?: Wallet;
}

interface DefaultTile extends BaseTile {
  next: Next;
}

interface DisabledTile extends BaseTile {
  disabled: true;
}

interface WalletTile extends BaseTile {
  wallet: Wallet;
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

export interface Options {
  service?: string;
  query?: Query;
}

type Query = { [k in keyof AppParams]: string };

// --- HOOK --- //

interface FeatureTreeInterface {
  getTiles: (id?: string) => Tile[] | undefined;
  setOptions: (options: Options) => void;
}

export function useFeatureTree(): FeatureTreeInterface {
  const { language } = useSettingsContext();
  const { setParams } = useParamContext();
  const { setParams: setUrlParams } = useNavigation();

  function getTiles(pageId?: string): Tile[] | undefined {
    if (!language) return;

    return (FeatureTree.find((p) => p.id === pageId) ?? FeatureTree[0]).tiles.map((t) => ({
      ...t,
      img: getImgUrl(t, language),
    }));
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

  return useMemo(() => ({ getTiles, setOptions }), [language, setParams]);
}
