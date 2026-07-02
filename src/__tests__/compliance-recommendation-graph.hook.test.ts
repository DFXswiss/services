import { renderHook } from '@testing-library/react';

// capture the api call args; the hook resolves call() to the returned graph
const mockCall = jest.fn();

// useCompliance loads a few @dfx.swiss/react enum values at module scope, so the mock provides them
// alongside useApi (which returns our capturing call).
jest.mock('@dfx.swiss/react', () => ({
  useApi: () => ({ call: mockCall }),
  PhoneCallStatus: {
    COMPLETED: 'Completed',
    UNAVAILABLE: 'Unavailable',
    SUSPICIOUS: 'Suspicious',
    FAILED: 'Failed',
    REPEAT: 'Repeat',
  },
  CallQueue: {
    MANUAL_CHECK_PHONE: 'ManualCheckPhone',
    MANUAL_CHECK_IP_PHONE: 'ManualCheckIpPhone',
    MANUAL_CHECK_IP_COUNTRY_PHONE: 'ManualCheckIpCountryPhone',
    MANUAL_CHECK_EXTERNAL_ACCOUNT_PHONE: 'ManualCheckExternalAccountPhone',
    UNAVAILABLE_SUSPICIOUS: 'UnavailableSuspicious',
  },
}));

// useCompliance now sources its call from useGuardedApi, which calls useNavigation (react-router hooks);
// stub navigation so renderHook works without a <Router> wrapper.
jest.mock('../hooks/navigation.hook', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { useCompliance } from '../hooks/compliance.hook';

describe('useCompliance().getRecommendationGraphNeighbors', () => {
  beforeEach(() => {
    // react-scripts sets resetMocks:true, which wipes implementations before each test
    mockCall.mockReset().mockResolvedValue({ nodes: [], edges: [], rootId: 1 });
  });

  it('builds the URL with skip & take query params and calls the api', async () => {
    const { result } = renderHook(() => useCompliance());

    const graph = await result.current.getRecommendationGraphNeighbors(42, 25, 10);

    expect(mockCall).toHaveBeenCalledTimes(1);
    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/recommendation-graph/42/neighbors?skip=25&take=10',
      method: 'GET',
    });
    expect(graph).toEqual({ nodes: [], edges: [], rootId: 1 });
  });

  it('omits the query string entirely when neither skip nor take is given', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.getRecommendationGraphNeighbors(7);

    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/recommendation-graph/7/neighbors',
      method: 'GET',
    });
  });

  it('includes only skip when take is omitted', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.getRecommendationGraphNeighbors(7, 50);

    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/recommendation-graph/7/neighbors?skip=50',
      method: 'GET',
    });
  });

  it('includes only take when skip is omitted', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.getRecommendationGraphNeighbors(7, undefined, 5);

    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/recommendation-graph/7/neighbors?take=5',
      method: 'GET',
    });
  });

  it('treats skip=0 as a present param (not omitted)', async () => {
    const { result } = renderHook(() => useCompliance());

    await result.current.getRecommendationGraphNeighbors(7, 0, 25);

    expect(mockCall).toHaveBeenCalledWith({
      url: 'support/recommendation-graph/7/neighbors?skip=0&take=25',
      method: 'GET',
    });
  });
});
