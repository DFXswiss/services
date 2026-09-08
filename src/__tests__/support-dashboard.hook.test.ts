const mockCall = jest.fn();

jest.mock('src/hooks/guarded-api.hook', () => ({
  useGuardedApi: () => ({ call: mockCall }),
}));

jest.mock('@dfx.swiss/react', () => ({
  Department: { SUPPORT: 'Support', COMPLIANCE: 'Compliance', MARKETING: 'Marketing' },
}));

import { renderHook } from '@testing-library/react';
import { useSupportDashboard } from 'src/hooks/support-dashboard.hook';

describe('useSupportDashboard', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  it('getMessageFile defaults to access=View', async () => {
    const { result } = renderHook(() => useSupportDashboard());

    await result.current.getMessageFile('issue-uid', 7);

    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/issue/issue-uid/message/7/file?access=View',
      method: 'GET',
    });
  });

  it('getMessageFile requests access=Download when asked', async () => {
    const { result } = renderHook(() => useSupportDashboard());

    await result.current.getMessageFile('issue-uid', 7, 'Download');

    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/issue/issue-uid/message/7/file?access=Download',
      method: 'GET',
    });
  });
});
