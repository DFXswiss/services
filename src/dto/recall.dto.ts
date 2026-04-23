export enum RecallReason {
  DUPL = 'DUPL',
  TECH = 'TECH',
  FRAD = 'FRAD',
  CUST = 'CUST',
  AM09 = 'AM09',
  AC03 = 'AC03',
  UNKNOWN = 'Unknown',
}

export interface RecallListEntry {
  id: number;
  created: Date;
  updated: Date;
  sequence: number;
  comment: string;
  fee: number;
  reason?: RecallReason;
  bankTx?: { id: number };
  checkoutTx?: { id: number };
  user?: { id: number };
}

export interface CreateRecallDto {
  bankTxId?: number;
  checkoutTxId?: number;
  sequence: number;
  comment: string;
  fee: number;
  reason: RecallReason;
  userId?: number;
}
