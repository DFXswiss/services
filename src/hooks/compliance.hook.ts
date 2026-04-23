import {
  AccountType,
  Asset,
  Fiat,
  FundOrigin,
  InvestmentDate,
  KycStatus,
  ResponseType,
  useApi,
} from '@dfx.swiss/react';
import { CreateMrosDto, MrosListEntry } from 'src/dto/mros.dto';
import { CustodyOrderListEntry } from 'src/dto/order.dto';
import { CreateRecallDto, RecallListEntry } from 'src/dto/recall.dto';
import { electronicFormatIBAN, isValidIBAN } from 'ibantools';
import { useMemo } from 'react';
import { downloadFile, downloadPdfFromString, filenameDateFormat } from 'src/util/utils';

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
  expiryDate: string;
  fee: RefundFeeData;
  refundAmount: number;
  refundAsset: Asset | Fiat;
  inputAmount: number;
  inputAsset: Asset | Fiat;
  refundTarget?: string;
  bankDetails?: RefundBankDetails;
}

export interface ChargebackRefundData {
  refundTarget?: string;
  creditorData?: {
    name: string;
    address: string;
    houseNumber?: string;
    zip: string;
    city: string;
    country: string;
  };
  chargebackAmount?: number;
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

export interface PendingOnboardingInfo {
  id: number;
  name?: string;
  accountType?: string;
  date: string;
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
  recall?: RecallInfo;
}

export interface BankTxInfo {
  id: number;
  transactionId?: number;
  accountServiceRef: string;
  amount: number;
  currency: string;
  type: string;
  name?: string;
  iban?: string;
  remittanceInfo?: string;
  recall?: RecallInfo;
}

export interface RecallInfo {
  id: number;
  created: string;
  sequence: number;
  reason?: string;
  comment: string;
  fee: number;
}

export interface IpLogInfo {
  id: number;
  ip: string;
  country?: string;
  url: string;
  result: boolean;
  created: string;
}

export interface SupportMessageInfo {
  author: string;
  message?: string;
  created: string;
}

export interface LimitRequestInfo {
  limit: number;
  acceptedLimit?: number;
  decision?: string;
  fundOrigin: string;
}

export interface SupportIssueInfo {
  id: number;
  uid: string;
  type: string;
  state: string;
  reason: string;
  name: string;
  clerk?: string;
  department?: string;
  information?: string;
  messages: SupportMessageInfo[];
  transaction?: Pick<TransactionInfo, 'id' | 'uid' | 'type' | 'sourceType' | 'amountInChf' | 'amlCheck'>;
  limitRequest?: LimitRequestInfo;
  created: string;
}

export interface CryptoInputInfo {
  id: number;
  transactionId?: number;
  inTxId: string;
  inTxExplorerUrl?: string;
  status?: string;
  amount: number;
  assetName?: string;
  blockchain?: string;
  senderAddresses?: string;
  returnTxId?: string;
  returnTxExplorerUrl?: string;
  purpose?: string;
}

export interface ComplianceUserData {
  userData: Record<string, unknown>;
  kycFiles: KycFile[];
  kycSteps: KycStepInfo[];
  kycLogs: KycLogInfo[];
  transactions: TransactionInfo[];
  bankTxs: BankTxInfo[];
  cryptoInputs: CryptoInputInfo[];
  ipLogs: IpLogInfo[];
  supportIssues: SupportIssueInfo[];
  users: UserInfo[];
  bankDatas: BankDataInfo[];
  buyRoutes: BuyRouteInfo[];
  sellRoutes: SellRouteInfo[];
}

export interface RecommendationGraphNode {
  id: number;
  firstname?: string;
  surname?: string;
  kycStatus?: string;
  kycLevel?: number;
  tradeApprovalDate?: string;
}

export interface RecommendationGraphEdge {
  id: number;
  recommenderId: number;
  recommendedId: number;
  method: string;
  type: string;
  isConfirmed?: boolean;
  confirmationDate?: string;
  created: string;
}

export interface RecommendationGraph {
  nodes: RecommendationGraphNode[];
  edges: RecommendationGraphEdge[];
  rootId: number;
}

export interface RecommendationUserInfo {
  id: number;
  firstname?: string;
  surname?: string;
}

export interface RecommendationEntry {
  id: number;
  recommended: RecommendationUserInfo;
  isConfirmed?: boolean;
  confirmationDate?: string;
  created: string;
}

export interface KycStepInfo {
  id: number;
  name: string;
  type?: string;
  status: string;
  sequenceNumber: number;
  result?: string;
  comment?: string;
  recommender?: RecommendationUserInfo;
  recommended?: RecommendationUserInfo;
  allRecommendations?: RecommendationEntry[];
  created: string;
}

export interface KycLogInfo {
  id: number;
  type: string;
  result?: string;
  comment?: string;
  created: string;
}

export interface UserInfo {
  id: number;
  address: string;
  ref?: string;
  role: string;
  status: string;
  walletName?: string;
  created: string;
}

export interface TransactionInfo {
  id: number;
  uid: string;
  buyCryptoId?: number;
  buyFiatId?: number;
  type?: string;
  sourceType: string;
  inputAmount?: number;
  inputAsset?: string;
  inputTxId?: string;
  outputAmount?: number;
  outputAsset?: string;
  comment?: string;
  amountInChf?: number;
  amountInEur?: number;
  amlCheck?: string;
  chargebackDate?: string;
  amlReason?: string;
  isCompleted: boolean;
  created: string;
}

export interface BankDataInfo {
  id: number;
  iban: string;
  name: string;
  type?: string;
  status?: string;
  approved: boolean;
  manualApproved?: boolean;
  active: boolean;
  comment?: string;
  created: string;
}

export interface BuyRouteInfo {
  id: number;
  iban?: string;
  bankUsage: string;
  assetName: string;
  blockchain: string;
  volume: number;
  active: boolean;
  created: string;
}

export interface SellRouteInfo {
  id: number;
  iban: string;
  fiatName?: string;
  volume: number;
  active: boolean;
  created: string;
}

export interface KycFile {
  id: number;
  name: string;
  type: string;
  subType?: string;
  protected: boolean;
  valid: boolean;
  uid: string;
  created?: string;
}

export interface TransactionListEntry {
  id: number;
  type?: string;
  accountId?: number;
  kycFileId?: number;
  name?: string;
  domicile?: string;
  created?: string;
  eventDate?: string;
  outputDate?: string;
  assets?: string;
  amountInChf?: number;
  highRisk?: boolean;
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
  newOpeningInAuditPeriod?: boolean;
  highRisk?: boolean;
  pep?: boolean;
  complexOrgStructure?: boolean;
  totalVolumeChfAuditPeriod?: number;
  totalCustodyBalanceChfAuditPeriod?: number;
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

  async function checkUserFiles(userDataIds: number[]): Promise<void> {
    const { data, headers } = await call<{ data: Blob; headers: Record<string, string> }>({
      url: 'userData/download',
      method: 'POST',
      data: { userDataIds, checkOnly: true },
      responseType: ResponseType.BLOB,
    });

    downloadFile(data, headers, `DFX_check_${filenameDateFormat()}.zip`);
  }

  async function getTransactionRefundData(transactionId: number): Promise<TransactionRefundData> {
    return call<TransactionRefundData>({
      url: `support/transaction/${transactionId}/refund`,
      method: 'GET',
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

  async function getTransactionList(params?: {
    createdFrom?: string;
    createdTo?: string;
    outputFrom?: string;
    outputTo?: string;
  }): Promise<TransactionListEntry[]> {
    const queryParts = Object.entries(params ?? {})
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`);
    const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';

    return call<TransactionListEntry[]>({
      url: `support/transactionList${queryString}`,
      method: 'GET',
    });
  }

  async function getCustodyOrders(): Promise<CustodyOrderListEntry[]> {
    return call<CustodyOrderListEntry[]>({
      url: 'custody/admin/orders',
      method: 'GET',
    });
  }

  async function approveCustodyOrder(id: number): Promise<void> {
    return call<void>({
      url: `custody/admin/order/${id}/approve`,
      method: 'POST',
    });
  }

  async function downloadIpLogPdf(userDataId: number): Promise<void> {
    const response = await call<{ pdfData: string }>({
      url: `support/${userDataId}/ip-log-pdf`,
      method: 'GET',
    });
    downloadPdfFromString(response.pdfData, `DFX_IP_Logs_${userDataId}_${filenameDateFormat()}.pdf`);
  }

  async function downloadTransactionPdf(userDataId: number): Promise<void> {
    const response = await call<{ pdfData: string }>({
      url: `support/${userDataId}/transaction-pdf`,
      method: 'GET',
    });
    downloadPdfFromString(response.pdfData, `DFX_Transactions_${userDataId}_${filenameDateFormat()}.pdf`);
  }

  async function generateOnboardingPdf(
    userDataId: number,
    data: {
      finalDecision: string;
      processedBy: string;
      complexOrgStructure?: string;
      highRisk?: string;
      depositLimit?: string;
      amlAccountType?: string;
      commentGmeR?: string;
      reasonSeatingCompany?: string;
      businessActivities?: string;
    },
  ): Promise<{ pdfData: string; fileName: string }> {
    return call<{ pdfData: string; fileName: string }>({
      url: `support/${userDataId}/onboarding-pdf`,
      method: 'POST',
      data,
    });
  }

  async function getPendingOnboardings(): Promise<PendingOnboardingInfo[]> {
    return call<PendingOnboardingInfo[]>({
      url: 'support/pending-onboardings',
      method: 'GET',
    });
  }

  async function getMrosList(): Promise<MrosListEntry[]> {
    return call<MrosListEntry[]>({
      url: 'mros',
      method: 'GET',
    });
  }

  async function getMrosById(id: number): Promise<MrosListEntry> {
    return call<MrosListEntry>({
      url: `mros/${id}`,
      method: 'GET',
    });
  }

  async function createMros(dto: CreateMrosDto): Promise<void> {
    return call<void>({
      url: 'mros',
      method: 'POST',
      data: dto,
    });
  }

  async function getRecalls(): Promise<RecallListEntry[]> {
    return call<RecallListEntry[]>({
      url: 'recall',
      method: 'GET',
    });
  }

  async function createRecall(dto: CreateRecallDto): Promise<void> {
    return call<void>({
      url: 'recall',
      method: 'POST',
      data: dto,
    });
  }

  async function getRecommendationGraph(userDataId: number): Promise<RecommendationGraph> {
    return call<RecommendationGraph>({
      url: `support/recommendation-graph/${userDataId}`,
      method: 'GET',
    });
  }

  async function updateKycStep(
    stepId: number,
    data: { status: string; result?: string; comment?: string },
  ): Promise<void> {
    return call<void>({
      url: `kyc/admin/step/${stepId}`,
      method: 'PUT',
      data,
    });
  }

  async function updateUserData(userDataId: number, data: Record<string, unknown>): Promise<void> {
    return call<void>({
      url: `userData/${userDataId}`,
      method: 'PUT',
      data,
    });
  }

  async function createLimitRequest(
    userDataId: number,
    data: {
      name: string;
      message: string;
      limit: number;
      investmentDate: InvestmentDate;
      fundOrigin: FundOrigin;
      file?: string;
      fileName?: string;
    },
  ): Promise<void> {
    return call<void>({
      url: `support/issue/support?userDataId=${userDataId}`,
      method: 'POST',
      data: {
        type: 'LimitRequest',
        reason: 'Other',
        name: data.name,
        message: data.message,
        file: data.file,
        fileName: data.fileName,
        limitRequest: {
          limit: data.limit,
          investmentDate: data.investmentDate,
          fundOrigin: data.fundOrigin,
          fundOriginText: data.message,
        },
      },
    });
  }

  async function chargebackTransaction(transactionId: number, data: ChargebackRefundData): Promise<void> {
    return call<void>({
      url: `support/transaction/${transactionId}/refund`,
      method: 'PUT',
      data,
    });
  }

  async function updateBankData(
    bankDataId: number,
    data: { manualApproved?: boolean; status?: string; approved?: boolean },
  ): Promise<void> {
    return call<void>({
      url: `bankData/${bankDataId}`,
      method: 'PUT',
      data,
    });
  }

  async function stopTransaction(transactionId: number): Promise<void> {
    return call<void>({
      url: `transaction/admin/${transactionId}/stop`,
      method: 'POST',
    });
  }

  async function updateBuyCrypto(
    id: number,
    data: { amlCheck?: string; amlReason?: string; comment?: string; priceDefinitionAllowedDate?: string },
  ): Promise<void> {
    return call<void>({
      url: `buyCrypto/${id}`,
      method: 'PUT',
      data,
    });
  }

  async function updateBuyFiat(
    id: number,
    data: { amlCheck?: string; amlReason?: string; comment?: string; priceDefinitionAllowedDate?: string },
  ): Promise<void> {
    return call<void>({
      url: `buyFiat/${id}`,
      method: 'PUT',
      data,
    });
  }

  async function resetBuyCryptoAml(id: number): Promise<void> {
    return call<void>({
      url: `buyCrypto/${id}/amlCheck`,
      method: 'DELETE',
    });
  }

  async function resetBuyFiatAml(id: number): Promise<void> {
    return call<void>({
      url: `buyFiat/${id}/amlCheck`,
      method: 'DELETE',
    });
  }

  return useMemo(
    () => ({
      search,
      getUserData,
      getPendingOnboardings,
      downloadUserFiles,
      checkUserFiles,
      getTransactionRefundData,
      getKycFileList,
      getKycFileStats,
      getTransactionList,
      getRecommendationGraph,
      downloadIpLogPdf,
      downloadTransactionPdf,
      generateOnboardingPdf,
      getCustodyOrders,
      approveCustodyOrder,
      getMrosList,
      getMrosById,
      createMros,
      getRecalls,
      createRecall,
      updateKycStep,
      updateUserData,
      createLimitRequest,
      chargebackTransaction,
      stopTransaction,
      updateBankData,
      updateBuyCrypto,
      updateBuyFiat,
      resetBuyCryptoAml,
      resetBuyFiatAml,
    }),
    [call],
  );
}
