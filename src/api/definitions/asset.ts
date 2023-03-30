import { Blockchain } from './blockchain';

export const AssetUrl = { get: `asset?blockchains=${Object.values(Blockchain).join(',')}` };

export interface Asset {
  id: number;
  name: string;
  description: string;
  buyable: boolean;
  sellable: boolean;
  blockchain: Blockchain;
  comingSoon: boolean;
  sortOrder?: number;
}
