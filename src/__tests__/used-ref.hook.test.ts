// Unit tests for useUsedRef: the PUT payload and the referral-code pattern the form validates with.

import { renderHook } from '@testing-library/react';

const mockCall = jest.fn();

jest.mock('src/hooks/guarded-api.hook', () => ({
  useGuardedApi: () => ({ call: mockCall }),
}));

import { USED_REF_PATTERN, useUsedRef } from 'src/hooks/used-ref.hook';

describe('useUsedRef', () => {
  beforeEach(() => {
    // react-scripts sets resetMocks:true, which wipes implementations before each test
    mockCall.mockReset();
  });

  it('updateUsedRef calls PUT support/user/:id/usedRef with the dto and returns the updated wallet', async () => {
    const updated = { id: 422258, address: '0x6ce9', usedRef: '194-687', role: 'User', status: 'Active' };
    mockCall.mockResolvedValue(updated);

    const { result } = renderHook(() => useUsedRef());
    const wallet = await result.current.updateUsedRef(422258, { usedRef: '194-687', reason: 'confirmed' });

    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/user/422258/usedRef',
      method: 'PUT',
      data: { usedRef: '194-687', reason: 'confirmed' },
    });
    expect(wallet).toBe(updated);
  });

  it('keeps the same function identity across re-renders while the api call is stable', () => {
    const { result, rerender } = renderHook(() => useUsedRef());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it.each(['194-687', 'AAA-000', 'a-b', '000-000'])('accepts the referral code %s', (code) => {
    expect(USED_REF_PATTERN.test(code)).toBe(true);
  });

  it.each(['194687', '1234-567', '194-687x', '', ' 194-687'])('rejects the referral code %j', (code) => {
    expect(USED_REF_PATTERN.test(code)).toBe(false);
  });
});
