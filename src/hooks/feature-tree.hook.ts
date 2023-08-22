import { Language } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { FeatureTree } from '../config/feature-tree';
import { useSettingsContext } from '../contexts/settings.context';
import { WalletType } from '../contexts/wallet.context';
import { useNavigation } from './navigation.hook';

// --- INTERFACES --- //
export interface Page {
  id: string;
  tiles: Tile[];
}

export type Tile = DefaultTile | ComingSoonTile | WalletTile;

export interface BaseTile {
  id: string;
  img: string;
  comingSoon?: boolean;
  next?: Next;
  wallet?: WalletType;
}

interface DefaultTile extends BaseTile {
  next: Next;
}

interface ComingSoonTile extends BaseTile {
  comingSoon: true;
}

interface WalletTile extends BaseTile {
  wallet: WalletType;
}

export interface Next {
  page: string;
  tiles?: string[];
  options?: Options;
}

export interface Options {
  service?: string;
  query?: Record<string, string>;
}

// --- HOOK --- //

interface FeatureTreeInterface {
  getTiles: (id?: string) => Tile[] | undefined;
  setOptions: (options: Options) => void;
}

export function useFeatureTree(): FeatureTreeInterface {
  const { language } = useSettingsContext();
  const { setParams } = useNavigation();

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
    const params = new URLSearchParams();

    // service
    if (options.service) params.set('redirect-path', `/${options.service}`);

    // query
    for (const [key, value] of Object.entries(options.query ?? {})) {
      params.set(key, value);
    }
    setParams(params);
  }

  return useMemo(() => ({ getTiles, setOptions }), [language, setParams]);
}
