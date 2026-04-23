export enum MrosStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  CONFIRMED = 'Confirmed',
  CLOSED = 'Closed',
}

export interface MrosListEntry {
  id: number;
  created: Date;
  updated: Date;
  status: MrosStatus;
  submissionDate?: Date;
  authorityReference?: string;
  caseManager: string;
  userData: { id: number };
}
