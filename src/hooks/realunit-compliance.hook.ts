import { useMemo } from 'react';
import {
  RealUnitCustomerDetailDto,
  RealUnitCustomerListDto,
  RealUnitKycFileDownloadDto,
} from 'src/dto/realunit-compliance.dto';
import { useGuardedApi } from './guarded-api.hook';

// RealUnit tenant compliance hook. READ-ONLY, strictly customer-scoped `/v1/realunit/compliance/*` endpoints over
// ONLY the tenant's own customers. Returns the REDUCED dossier (no DFX AML work products). `call` MUST come from
// useGuardedApi so the staff 2FA (TFA_REQUIRED) redirect works.
export function useRealunitCompliance() {
  const { call } = useGuardedApi();

  async function searchCustomers(key: string): Promise<RealUnitCustomerListDto[]> {
    return call<RealUnitCustomerListDto[]>({
      url: `realunit/compliance/customers?key=${encodeURIComponent(key)}`,
      method: 'GET',
    });
  }

  async function getCustomer(id: number): Promise<RealUnitCustomerDetailDto> {
    return call<RealUnitCustomerDetailDto>({
      url: `realunit/compliance/customers/${id}`,
      method: 'GET',
    });
  }

  async function downloadFile(id: number, uid: string): Promise<RealUnitKycFileDownloadDto> {
    return call<RealUnitKycFileDownloadDto>({
      url: `realunit/compliance/customers/${id}/files/${uid}`,
      method: 'GET',
    });
  }

  return useMemo(
    () => ({
      searchCustomers,
      getCustomer,
      downloadFile,
    }),
    [call],
  );
}
