import { useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';

export const CustomerAuthor = 'Customer';

export interface SupportIssueListItem {
  id: number;
  uid: string;
  type: string;
  reason: string;
  state: string;
  name: string;
  clerk?: string;
  department?: string;
  created: string;
  messageCount: number;
  lastMessageDate?: string;
  lastMessageAuthor?: string;
}

export interface SupportIssueInternalAccountData {
  id: number;
  status: string;
  verifiedName?: string;
  completeName?: string;
  accountType?: string;
  kycLevel: string;
  depositLimit?: number;
  annualVolume: number;
  kycHash: string;
  country?: { name: string };
}

export interface SupportIssueInternalTransactionData {
  id: number;
  sourceType: string;
  type: string;
  amlCheck?: string;
  amlReason?: string;
  comment?: string;
  inputAmount?: number;
  inputAsset?: string;
  inputBlockchain?: string;
  outputAmount?: number;
  outputAsset?: string;
  outputBlockchain?: string;
  wallet?: { name: string; amlRules: string; isKycClient: boolean };
  isComplete?: boolean;
}

export interface SupportIssueInternalLimitRequestData {
  id: number;
  limit: number;
  acceptedLimit?: number;
  investmentDate: string;
  fundOrigin: string;
  decision?: string;
}

export interface SupportIssueInternalTransactionMissingData {
  senderIban?: string;
  receiverIban?: string;
  date?: string;
}

export interface SupportIssueInternalData {
  id: number;
  created: string;
  uid: string;
  type: string;
  department?: string;
  reason: string;
  state: string;
  name: string;
  clerk?: string;
  account: SupportIssueInternalAccountData;
  transaction?: SupportIssueInternalTransactionData;
  limitRequest?: SupportIssueInternalLimitRequestData;
  transactionMissing?: SupportIssueInternalTransactionMissingData;
}

export interface SupportMessageInfo {
  id: number;
  author: string;
  message?: string;
  fileName?: string;
  created: string;
}

export interface UserSearchResult {
  id: number;
  kycStatus: string;
  accountType?: string;
  mail?: string;
  name?: string;
}

export function useSupportDashboard() {
  const { call } = useApi();

  async function getIssueList(params?: {
    department?: string;
    state?: string;
    type?: string;
    take?: number;
    skip?: number;
    query?: string;
  }): Promise<{ data: SupportIssueListItem[]; total: number }> {
    const queryParts = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
    const queryString = queryParts.length ? `?${queryParts.join('&')}` : '';

    return call<{ data: SupportIssueListItem[]; total: number }>({
      url: `support/issue/support/list${queryString}`,
      method: 'GET',
    });
  }

  async function getIssueData(issueId: number): Promise<SupportIssueInternalData> {
    return call<SupportIssueInternalData>({
      url: `support/issue/${issueId}/data`,
      method: 'GET',
    });
  }

  async function updateIssue(
    issueId: number,
    data: { state?: string; clerk?: string; department?: string },
  ): Promise<void> {
    return call<void>({
      url: `support/issue/${issueId}`,
      method: 'PUT',
      data,
    });
  }

  async function sendMessage(
    issueId: number,
    data: { author: string; message?: string; file?: string; fileName?: string },
  ): Promise<SupportMessageInfo> {
    return call<SupportMessageInfo>({
      url: `support/issue/${issueId}/message`,
      method: 'POST',
      data,
    });
  }

  async function createIssue(
    userDataId: number,
    data: {
      type: string;
      reason: string;
      name: string;
      department?: string;
      author: string;
      message?: string;
      file?: string;
      fileName?: string;
    },
  ): Promise<void> {
    return call<void>({
      url: `support/issue/support?userDataId=${userDataId}`,
      method: 'POST',
      data,
    });
  }

  async function searchUsers(key: string): Promise<UserSearchResult[]> {
    const result = await call<{ userDatas: UserSearchResult[] }>({
      url: `support?key=${encodeURIComponent(key)}`,
      method: 'GET',
    });
    return result.userDatas ?? [];
  }

  async function getIssueMessages(issueUid: string, fromMessageId?: number): Promise<SupportMessageInfo[]> {
    const query = fromMessageId ? `?fromMessageId=${fromMessageId}` : '';
    const result = await call<{ messages: SupportMessageInfo[] }>({
      url: `support/issue/${issueUid}${query}`,
      method: 'GET',
    });
    return result.messages;
  }

  async function getMessageFile(
    issueId: string,
    messageId: number,
  ): Promise<{ data: { type: string; data: number[] }; contentType: string }> {
    return call<{ data: { type: string; data: number[] }; contentType: string }>({
      url: `support/issue/${issueId}/message/${messageId}/file`,
      method: 'GET',
    });
  }

  return useMemo(
    () => ({
      getIssueList,
      getIssueData,
      updateIssue,
      sendMessage,
      createIssue,
      getIssueMessages,
      getMessageFile,
      searchUsers,
    }),
    [call],
  );
}
