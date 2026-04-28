import {
  AccountType,
  AmlReason,
  Asset,
  CallQueue,
  CallQueueItem,
  CallQueueSourceType,
  CallQueueSummaryEntry,
  CheckStatus,
  Fiat,
  FundOrigin,
  InvestmentDate,
  KycStatus,
  PendingReviewItem,
  PendingReviewStatus,
  PendingReviewSummaryEntry,
  PendingReviewType,
  PhoneCallStatus,
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

export type CallOutcomeContext =
  | { queue: CallQueue; userDataId: number; txId: number; sourceType: CallQueueSourceType }
  | { queue: CallQueue; userDataId: number; txId?: undefined; sourceType?: undefined };

export enum CallOutcome {
  COMPLETED = 'Completed',
  UNAVAILABLE = 'Unavailable',
  SUSPICIOUS = 'Suspicious',
  USER_REJECTED = 'UserRejected',
  REPEAT = 'Repeat',
  RESET = 'Reset',
}

export type CallOutcomeStep = 'transaction' | 'userData' | 'log';

export interface CallOutcomeResult {
  success: boolean;
  failedStep?: CallOutcomeStep;
  completedSteps: CallOutcomeStep[];
  message?: string;
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

// Partial view of the backend UserData entity as exposed by the compliance endpoint.
// Index signature keeps compatibility with legacy Record<string, unknown> consumers;
// named fields add type safety for the values the UI actually reads.
export interface UserDataDetail {
  [key: string]: unknown;
  id?: number;
  accountType?: string;
  status?: string;
  kycStatus?: string;
  kycLevel?: number;
  firstname?: string;
  surname?: string;
  verifiedName?: string;
  mail?: string;
  phone?: string;
  birthday?: string;
  street?: string;
  houseNumber?: string;
  zip?: string;
  location?: string;
  city?: string;
  phoneCallStatus?: string;
  phoneCallTimes?: string;
  phoneCallCheckDate?: string;
  phoneCallIpCheckDate?: string;
  phoneCallIpCountryCheckDate?: string;
  phoneCallExternalAccountCheckDate?: string;
  organization?: { name?: string };
  nationality?: { name?: string };
  language?: { name?: string; symbol?: string };
  country?: { name?: string; symbol?: string };
  wallet?: { name?: string };
}

export interface ComplianceUserData {
  userData: UserDataDetail;
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
  usedRef?: string;
  refUserName?: string;
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

const callOutcomeToPhoneStatus: Record<CallOutcome, PhoneCallStatus | undefined> = {
  [CallOutcome.COMPLETED]: PhoneCallStatus.COMPLETED,
  [CallOutcome.UNAVAILABLE]: PhoneCallStatus.UNAVAILABLE,
  [CallOutcome.SUSPICIOUS]: PhoneCallStatus.SUSPICIOUS,
  [CallOutcome.USER_REJECTED]: PhoneCallStatus.USER_REJECTED,
  [CallOutcome.REPEAT]: PhoneCallStatus.REPEAT,
  [CallOutcome.RESET]: undefined,
};

const checkDateFieldByQueue: Record<CallQueue, string> = {
  [CallQueue.MANUAL_CHECK_PHONE]: 'phoneCallCheckDate',
  [CallQueue.MANUAL_CHECK_IP_PHONE]: 'phoneCallIpCheckDate',
  [CallQueue.MANUAL_CHECK_IP_COUNTRY_PHONE]: 'phoneCallIpCountryCheckDate',
  [CallQueue.MANUAL_CHECK_EXTERNAL_ACCOUNT_PHONE]: 'phoneCallExternalAccountCheckDate',
  [CallQueue.UNAVAILABLE_SUSPICIOUS]: 'phoneCallCheckDate',
};

function checkDateFieldForQueue(queue: CallQueue): string {
  return checkDateFieldByQueue[queue];
}

function buildTxUpdatePayload(outcome: CallOutcome): { amlCheck?: string; amlReason?: string } | null {
  switch (outcome) {
    case CallOutcome.COMPLETED:
      return { amlCheck: CheckStatus.PASS };
    case CallOutcome.USER_REJECTED:
    case CallOutcome.SUSPICIOUS:
      return { amlCheck: CheckStatus.FAIL, amlReason: AmlReason.MANUAL_CHECK_PHONE_FAILED };
    default:
      return null;
  }
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

  async function getPendingReviews(): Promise<PendingReviewSummaryEntry[]> {
    return call<PendingReviewSummaryEntry[]>({
      url: 'support/pending-reviews',
      method: 'GET',
    });
  }

  async function getPendingReviewItems(
    type: PendingReviewType,
    status: PendingReviewStatus,
    name?: string,
  ): Promise<PendingReviewItem[]> {
    const query = new URLSearchParams({ type, status });
    if (name) query.set('name', name);
    return call<PendingReviewItem[]>({
      url: `support/pending-reviews/items?${query.toString()}`,
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

  async function getCallQueues(): Promise<CallQueueSummaryEntry[]> {
    return call<CallQueueSummaryEntry[]>({
      url: 'support/call-queues',
      method: 'GET',
    });
  }

  async function getCallQueueItems(queue: CallQueue): Promise<CallQueueItem[]> {
    return call<CallQueueItem[]>({
      url: `support/call-queues/${queue}/items`,
      method: 'GET',
    });
  }

  async function getCallQueueClerks(): Promise<string[]> {
    return call<string[]>({
      url: 'support/call-queues/clerks',
      method: 'GET',
    });
  }

  async function createKycLog(userDataId: number, comment: string): Promise<void> {
    return call<void>({
      url: 'kyc/admin/log',
      method: 'POST',
      data: { type: 'ManualLog', userData: { id: userDataId }, comment },
    });
  }

  async function saveCallOutcome(
    context: CallOutcomeContext,
    outcome: CallOutcome,
    options: { signature: string; comment?: string },
  ): Promise<CallOutcomeResult> {
    const completedSteps: CallOutcomeStep[] = [];
    const fail = (step: CallOutcomeStep, err: unknown): CallOutcomeResult => ({
      success: false,
      failedStep: step,
      completedSteps,
      message: err instanceof Error ? err.message : String(err),
    });

    const tx = context.txId != null && context.sourceType ? { id: context.txId, sourceType: context.sourceType } : null;

    if (outcome === CallOutcome.RESET && !tx) {
      return { success: false, failedStep: 'transaction', completedSteps, message: 'Reset requires a transaction' };
    }

    // 1) Transaction update (if applicable)
    try {
      if (outcome === CallOutcome.RESET && tx) {
        if (tx.sourceType === 'BuyCrypto') await resetBuyCryptoAml(tx.id);
        else await resetBuyFiatAml(tx.id);
        completedSteps.push('transaction');
      } else if (tx) {
        const txData = buildTxUpdatePayload(outcome);
        if (txData) {
          if (tx.sourceType === 'BuyCrypto') await updateBuyCrypto(tx.id, txData);
          else await updateBuyFiat(tx.id, txData);
          completedSteps.push('transaction');
        }
      }
    } catch (e) {
      return fail('transaction', e);
    }

    // 2) UserData update (phoneCallStatus + check date on completion)
    const phoneStatus = callOutcomeToPhoneStatus[outcome];
    const skipUserData = outcome === CallOutcome.REPEAT && context.queue === CallQueue.UNAVAILABLE_SUSPICIOUS;
    if (phoneStatus && !skipUserData) {
      try {
        const udData: Record<string, unknown> = { phoneCallStatus: phoneStatus };
        if (outcome === CallOutcome.COMPLETED) {
          udData[checkDateFieldForQueue(context.queue)] = new Date().toISOString();
        }
        await updateUserData(context.userDataId, udData);
        completedSteps.push('userData');
      } catch (e) {
        return fail('userData', e);
      }
    }

    // 3) KYC log entry (always)
    try {
      const comment = options.comment?.trim();
      const logMessage = [options.signature.trim(), outcome, comment].filter(Boolean).join(' – ');
      await createKycLog(context.userDataId, logMessage);
      completedSteps.push('log');
    } catch (e) {
      return fail('log', e);
    }

    return { success: true, completedSteps };
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
      author: string;
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
        author: data.author,
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
      getPendingReviews,
      getPendingReviewItems,
      getCallQueues,
      getCallQueueItems,
      getCallQueueClerks,
      saveCallOutcome,
      createKycLog,
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
