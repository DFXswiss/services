import { renderHook } from '@testing-library/react';

const mockCall = jest.fn();

jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: mockCall }),
}));

import { useRealunitApi } from '../hooks/realunit-api.hook';
import { realunitStatsFixture } from '../test-fixtures/realunit-stats.fixture';

describe('useRealunitApi - getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call the stats endpoint with GET', async () => {
    mockCall.mockResolvedValueOnce(realunitStatsFixture);

    const { result } = renderHook(() => useRealunitApi());
    const stats = await result.current.getStats();

    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/admin/stats', method: 'GET' });
    expect(stats).toEqual(realunitStatsFixture);
  });

  it('should propagate errors from the api', async () => {
    mockCall.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useRealunitApi());

    await expect(result.current.getStats()).rejects.toThrow('boom');
  });
});
