const mockStartStandaloneApp = jest.fn();
const mockReportWebVitals = jest.fn();

jest.mock('../util/boot-standalone', () => ({
  startStandaloneApp: (...args: unknown[]) => mockStartStandaloneApp(...args),
}));

jest.mock('../reportWebVitals', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockReportWebVitals(...args),
}));

jest.mock('../index.css', () => ({}));

describe('index', () => {
  beforeEach(() => {
    mockStartStandaloneApp.mockClear();
    mockReportWebVitals.mockClear();
  });

  it('calls startStandaloneApp then reportWebVitals on module load', () => {
    jest.isolateModules(() => {
      require('../index');
    });

    expect(mockStartStandaloneApp).toHaveBeenCalledTimes(1);
    expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
    expect(mockStartStandaloneApp.mock.invocationCallOrder[0]).toBeLessThan(
      mockReportWebVitals.mock.invocationCallOrder[0],
    );
  });
});
