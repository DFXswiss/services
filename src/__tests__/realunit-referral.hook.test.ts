// Hook test for useRealunitReferral: the operator endpoints build the right URL/method/body
// and go through useGuardedApi (→ useApi). react-router's useNavigation is stubbed so renderHook
// works without a <Router> wrapper.
import { renderHook } from '@testing-library/react';

const mockCall = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: mockCall }),
  TfaLevel: { STRICT: 'Strict' },
}));

jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { useRealunitReferral } from '../hooks/realunit-referral.hook';

describe('useRealunitReferral', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  it('lists relations', async () => {
    mockCall.mockResolvedValue([]);
    const { result } = renderHook(() => useRealunitReferral());

    await result.current.getRelations();

    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/referral/admin/relations', method: 'GET' });
  });

  it('approves a relation with a reason (PUT)', async () => {
    const { result } = renderHook(() => useRealunitReferral());

    await result.current.approveRelation(7, 'looks good');

    expect(mockCall).toHaveBeenCalledWith({
      url: 'realunit/referral/admin/relations/7/approve',
      method: 'PUT',
      data: { reason: 'looks good' },
    });
  });

  it('rejects a relation with a reason (PUT)', async () => {
    const { result } = renderHook(() => useRealunitReferral());

    await result.current.rejectRelation(8, 'suspicious');

    expect(mockCall).toHaveBeenCalledWith({
      url: 'realunit/referral/admin/relations/8/reject',
      method: 'PUT',
      data: { reason: 'suspicious' },
    });
  });

  it('awards a manual prize with a reason (POST)', async () => {
    const { result } = renderHook(() => useRealunitReferral());

    await result.current.createManualPrize(9, 'approved earlier');

    expect(mockCall).toHaveBeenCalledWith({
      url: 'realunit/referral/admin/relations/9/manual-prize',
      method: 'POST',
      data: { reason: 'approved earlier' },
    });
  });

  it('loads the prize wallet', async () => {
    mockCall.mockResolvedValue({ address: '0xprize', eth: 1.5, realu: 20 });
    const { result } = renderHook(() => useRealunitReferral());

    await expect(result.current.getPrizeWallet()).resolves.toEqual({ address: '0xprize', eth: 1.5, realu: 20 });
    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/referral/admin/prize-wallet', method: 'GET' });
  });
});
