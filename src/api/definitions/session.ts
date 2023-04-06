import { Blockchain } from './blockchain';

export interface Session {
  address: string;
  blockchains: Blockchain[];
}
