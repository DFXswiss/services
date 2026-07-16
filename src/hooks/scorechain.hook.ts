import { useMemo } from 'react';
import { ScorechainScreeningDto } from 'src/dto/scorechain.dto';
import { useGuardedApi } from './guarded-api.hook';

// Staff Scorechain hook. READ path lists ALL of a customer's screenings; the POST path re-triggers a screening
// for one buyCrypto and COSTS provider quota (gate it behind an explicit confirm). `call` MUST come from
// useGuardedApi so the staff 2FA (TFA_REQUIRED) redirect works. URLs are path-relative (no leading slash) —
// the SDK joins base + version.
export function useScorechain() {
  const { call } = useGuardedApi();

  async function getUserScreenings(userDataId: number): Promise<ScorechainScreeningDto[]> {
    return call<ScorechainScreeningDto[]>({ url: `support/${userDataId}/scorechain`, method: 'GET' });
  }

  async function retriggerBuyCrypto(buyCryptoId: number): Promise<ScorechainScreeningDto> {
    return call<ScorechainScreeningDto>({ url: `buyCrypto/${buyCryptoId}/scorechain`, method: 'POST' });
  }

  return useMemo(() => ({ getUserScreenings, retriggerBuyCrypto }), [call]);
}
