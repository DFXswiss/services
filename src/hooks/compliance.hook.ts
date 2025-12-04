import { AccountType, KycStatus, ResponseType, useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { downloadFile, filenameDateFormat } from 'src/util/utils';

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
  accountServiceRef: string;
  amount: number;
  currency: string;
  type: string;
  name?: string;
}

export interface ComplianceUserData {
  userData: object;
  kycFiles: KycFile[];
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

export function useCompliance() {
  const { call } = useApi();

  async function search(key: string): Promise<ComplianceSearchResult> {
    return call<ComplianceSearchResult>({
      url: `support?key=${encodeURIComponent(key)}`,
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

  async function getKycFile(uid: string): Promise<{ content: string; contentType: string }> {
    return call<{ content: string; contentType: string }>({
      url: `kyc/file/${uid}`,
      method: 'GET',
      version: 'v2',
    });
  }

  return useMemo(() => ({ search, getUserData, downloadUserFiles, getKycFile }), [call]);
}
