import { AccountType, KycStatus, ResponseType, useApi } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { downloadFile, filenameDateFormat } from 'src/util/utils';

export interface UserSearchResult {
  id: number;
  kycStatus: KycStatus;
  accountType?: AccountType;
  mail?: string;
  name?: string;
}

export function useCompliance() {
  const { call } = useApi();

  async function downloadUserData(userDataIds: number[]): Promise<void> {
    const { data, headers } = await call<{ data: Blob; headers: Record<string, string> }>({
      url: 'userData/download',
      method: 'POST',
      data: { userDataIds },
      responseType: ResponseType.BLOB,
    });

    downloadFile(data, headers, `DFX_export_${filenameDateFormat()}.zip`);
  }

  async function searchUsers(key: string): Promise<UserSearchResult[]> {
    return call<UserSearchResult[]>({
      url: `support?key=${encodeURIComponent(key)}`,
      method: 'GET',
    });
  }

  return useMemo(() => ({ downloadUserData, searchUsers }), [call]);
}
