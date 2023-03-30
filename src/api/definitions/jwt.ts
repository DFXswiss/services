import { Blockchain } from './blockchain';

export interface Jwt {
  exp: number;
  iat: number;
  address: string;
  blockchains: Blockchain[];
}
