export enum MrosStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  CONFIRMED = 'Confirmed',
  CLOSED = 'Closed',
}

export interface MrosPersonOverrides {
  gender?: string;
  middleName?: string;
  birthPlace?: string;
  profession?: string;
  sourceOfWealth?: string;
  canton?: string;
  idDocIssueDate?: string;
  idDocValidUntil?: string;
  idDocIssuingCountryCode?: string;
}

export interface MrosListEntry {
  id: number;
  created: Date;
  updated: Date;
  status: MrosStatus;
  reportCode?: string;
  submissionDate?: Date;
  authorityReference?: string;
  caseManager: string;
  reason?: string;
  action?: string;
  indicators?: string;
  personOverrides?: string;
  userData: { id: number };
  transactions?: { id: number }[];
}

export interface CreateMrosDto {
  userDataId: number;
  status: MrosStatus;
  submissionDate?: string;
  authorityReference?: string;
  caseManager: string;
  reportCode?: string;
  reason?: string;
  action?: string;
  indicators?: string[];
  personOverrides?: MrosPersonOverrides;
  transactionIds?: number[];
}

export interface UpdateMrosDto {
  status?: MrosStatus;
  submissionDate?: string;
  authorityReference?: string;
  caseManager?: string;
  reportCode?: string;
  reason?: string;
  action?: string;
  indicators?: string[];
  personOverrides?: MrosPersonOverrides;
  transactionIds?: number[];
}

export const DEFAULT_MROS_INDICATOR_CODES = ['0002M', '1004V', '2008G', '3004B', '3005B', '3007B'];
