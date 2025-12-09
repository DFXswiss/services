export enum VirtualIbanStatus {
  RESERVED = 'Reserved',
  ACTIVE = 'Active',
  EXPIRED = 'Expired',
  DEACTIVATED = 'Deactivated',
}

export interface VirtualIban {
  id: number;
  iban: string;
  bban?: string;
  currency: string;
  active: boolean;
  status?: VirtualIbanStatus;
  label?: string;
  activatedAt?: Date;
}

export interface CreateVirtualIban {
  currency: string;
}
