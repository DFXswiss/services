import { AccountType, Asset, Fiat, KycStatus, ResponseType, useApi } from '@dfx.swiss/react';
import { electronicFormatIBAN, isValidIBAN } from 'ibantools';
import { useMemo } from 'react';
import { downloadFile, filenameDateFormat } from 'src/util/utils';

export interface RefundFeeData {
  dfx: number;
  network: number;
  bank: number;
}

export interface RefundBankDetails {
  name?: string;
  address?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  country?: string;
  iban?: string;
  bic?: string;
}

export interface TransactionRefundData {
  expiryDate: Date;
  fee: RefundFeeData;
  refundAmount: number;
  refundAsset: Asset | Fiat;
  inputAmount: number;
  inputAsset: Asset | Fiat;
  refundTarget?: string;
  bankDetails?: RefundBankDetails;
}

export interface BankRefundData {
  refundTarget: string;
  name: string;
  address: string;
  houseNumber?: string;
  zip: string;
  city: string;
  country: string;
}

export enum ComplianceSearchType {
  REF = 'Ref',
  KYC_HASH = 'KycHash',
  BANK_USAGE = 'BankUsage',
  MAIL = 'Mail',
  USER_ADDRESS = 'UserAddress',
  DEPOSIT_ADDRESS = 'DepositAddress',
  TXID = 'TxId',
  ACCOUNT_SERVICE_REF = 'AccountServiceRef',
  USER_DATA_ID = 'UserDataId',
  IP = 'IP',
  PHONE = 'Phone',
  NAME = 'Name',
}

export interface ComplianceSearchResult {
  type: ComplianceSearchType;
  userDatas: UserSearchResult[];
  bankTx: BankTxSearchResult[];
}

export interface UserSearchResult {
  id: number;
  kycStatus: KycStatus;
  accountType?: AccountType;
  mail?: string;
  name?: string;
}

export interface BankTxSearchResult {
  id: number;
  transactionId?: number;
  accountServiceRef: string;
  amount: number;
  currency: string;
  type: string;
  name?: string;
  iban?: string;
}

export interface ComplianceUserData {
  userData: object;
  kycFiles: KycFile[];
  kycSteps: KycStepInfo[];
  transactions: TransactionInfo[];
  users: UserInfo[];
  bankDatas: BankDataInfo[];
  buyRoutes: BuyRouteInfo[];
  sellRoutes: SellRouteInfo[];
}

export interface KycStepInfo {
  id: number;
  name: string;
  type?: string;
  status: string;
  sequenceNumber: number;
  created: Date;
}

export interface UserInfo {
  id: number;
  address: string;
  role: string;
  status: string;
  created: Date;
}

export interface TransactionInfo {
  id: number;
  uid: string;
  type?: string;
  sourceType: string;
  amountInChf?: number;
  amlCheck?: string;
  created: Date;
}

export interface BankDataInfo {
  id: number;
  iban: string;
  name: string;
  approved: boolean;
}

export interface BuyRouteInfo {
  id: number;
  bankUsage: string;
  assetName: string;
  blockchain: string;
  volume: number;
  active: boolean;
}

export interface SellRouteInfo {
  id: number;
  iban: string;
  fiatName?: string;
  volume: number;
}

export interface KycFile {
  id: number;
  name: string;
  type: string;
  subType?: string;
  protected: boolean;
  valid: boolean;
  uid: string;
}

export interface KycFileListEntry {
  kycFileId: number;
  id: number;
  amlAccountType?: string;
  verifiedName?: string;
  country?: { name: string };
  allBeneficialOwnersDomicile?: string;
  amlListAddedDate?: string;
  amlListExpiredDate?: string;
  amlListReactivatedDate?: string;
  highRisk?: boolean;
  pep?: boolean;
  complexOrgStructure?: boolean;
  totalVolumeChfAuditPeriod?: number;
}

export interface KycFileYearlyStats {
  year: number;
  startCount: number;
  reopened: number;
  newFiles: number;
  addedDuringYear: number;
  activeDuringYear: number;
  closedDuringYear: number;
  endCount: number;
  highestFileNr: number;
}

function normalizeSearchKey(key: string): string {
  const normalized = electronicFormatIBAN(key);
  if (normalized && isValidIBAN(normalized)) {
    return normalized;
  }
  return key;
}

export function useCompliance() {
  const { call } = useApi();

  async function search(key: string): Promise<ComplianceSearchResult> {
    const normalizedKey = normalizeSearchKey(key);
    return call<ComplianceSearchResult>({
      url: `support?key=${encodeURIComponent(normalizedKey)}`,
      method: 'GET',
    });
  }

  async function getUserData(userDataId: number): Promise<ComplianceUserData> {
    return call<ComplianceUserData>({
      url: `support/${userDataId}`,
      method: 'GET',
    });
  }

  async function downloadUserFiles(userDataIds: number[]): Promise<void> {
    const { data, headers } = await call<{ data: Blob; headers: Record<string, string> }>({
      url: 'userData/download',
      method: 'POST',
      data: { userDataIds },
      responseType: ResponseType.BLOB,
    });

    downloadFile(data, headers, `DFX_export_${filenameDateFormat()}.zip`);
  }

  async function getTransactionRefundData(transactionId: number): Promise<TransactionRefundData> {
    return call<TransactionRefundData>({
      url: `support/transaction/${transactionId}/refund`,
      method: 'GET',
    });
  }

  async function processTransactionRefund(transactionId: number, data: BankRefundData): Promise<void> {
    return call<void>({
      url: `support/transaction/${transactionId}/refund`,
      method: 'PUT',
      data,
    });
  }

  async function getKycFileList(): Promise<KycFileListEntry[]> {
    return call<KycFileListEntry[]>({
      url: 'support/kycFileList',
      method: 'GET',
    });
  }

  async function getKycFileStats(): Promise<KycFileYearlyStats[]> {
    return call<KycFileYearlyStats[]>({
      url: 'support/kycFileStats',
      method: 'GET',
    });
  }

  return useMemo(
    () => ({
      search,
      getUserData,
      downloadUserFiles,
      getTransactionRefundData,
      processTransactionRefund,
      getKycFileList,
      getKycFileStats,
    }),
    [call],
  );
}
