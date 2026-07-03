import { renderHook } from '@testing-library/react';

// capture the api call args; call() resolves to the value we set per test
const mockCall = jest.fn();

// The hooks source `call` from useGuardedApi (→ useApi). support-dashboard.hook additionally reads Department at
// module scope (ASSIGNABLE_DEPARTMENTS), so the mock must expose it.
jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: mockCall }),
  Department: { SUPPORT: 'Support', COMPLIANCE: 'Compliance', MARKETING: 'Marketing' },
  TfaLevel: { STRICT: 'Strict' },
}));

// useGuardedApi calls useNavigation (react-router hooks); stub it so renderHook works without a <Router> wrapper.
jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { useRealunitCompliance } from '../hooks/realunit-compliance.hook';
import { useRealunitSupport } from '../hooks/realunit-support.hook';

describe('useRealunitSupport', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  it('builds the scoped issue-list URL, filtering out empty params', async () => {
    mockCall.mockResolvedValue({ data: [], total: 0 });
    const { result } = renderHook(() => useRealunitSupport());

    await result.current.getIssueList({ states: 'Created,Pending', type: '', query: 'abc' });

    expect(mockCall).toHaveBeenCalledWith({
      url: 'realunit/support/list?states=Created%2CPending&query=abc',
      method: 'GET',
    });
  });

  it('omits the query string when no list params are given', async () => {
    mockCall.mockResolvedValue({ data: [], total: 0 });
    const { result } = renderHook(() => useRealunitSupport());

    await result.current.getIssueList();

    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/support/list', method: 'GET' });
  });

  it('hits the scoped data/update/message/file endpoints', async () => {
    const { result } = renderHook(() => useRealunitSupport());

    await result.current.getIssueData(42);
    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/support/42/data', method: 'GET' });

    await result.current.updateIssue(42, { state: 'Completed', clerk: 'Alice' });
    expect(mockCall).toHaveBeenCalledWith({
      url: 'realunit/support/42',
      method: 'PUT',
      data: { state: 'Completed', clerk: 'Alice' },
    });

    await result.current.createMessage(42, { author: 'Alice', message: 'hi' });
    expect(mockCall).toHaveBeenCalledWith({
      url: 'realunit/support/42/message',
      method: 'POST',
      data: { author: 'Alice', message: 'hi' },
    });

    await result.current.getFile(42, 7);
    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/support/42/message/7/file', method: 'GET' });
  });

  it('reads the message thread from the shared UID endpoint', async () => {
    mockCall.mockResolvedValue({ messages: [{ id: 1, author: 'Alice', created: 'now' }] });
    const { result } = renderHook(() => useRealunitSupport());

    const messages = await result.current.getIssueMessages('issue-uid-123');

    expect(mockCall).toHaveBeenCalledWith({ url: 'support/issue/issue-uid-123', method: 'GET' });
    expect(messages).toEqual([{ id: 1, author: 'Alice', created: 'now' }]);
  });
});

describe('useRealunitCompliance', () => {
  beforeEach(() => {
    mockCall.mockReset().mockResolvedValue(undefined);
  });

  it('encodes the customer search key', async () => {
    mockCall.mockResolvedValue([]);
    const { result } = renderHook(() => useRealunitCompliance());

    await result.current.searchCustomers('a b@c');

    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/compliance/customers?key=a%20b%40c', method: 'GET' });
  });

  it('hits the reduced dossier and download endpoints', async () => {
    const { result } = renderHook(() => useRealunitCompliance());

    await result.current.getCustomer(9);
    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/compliance/customers/9', method: 'GET' });

    await result.current.downloadFile(9, 'file-uid');
    expect(mockCall).toHaveBeenCalledWith({ url: 'realunit/compliance/customers/9/files/file-uid', method: 'GET' });
  });
});
