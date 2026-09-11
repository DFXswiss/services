import { render, screen } from '@testing-library/react';

jest.mock('../App', () => ({
  __esModule: true,
  default: function AppStub() {
    return <div data-testid="app-stub" />;
  },
}));

jest.mock('../components/boot-error-boundary', () => ({
  StorageBlockedBanner: function StorageBlockedBannerStub() {
    return <div data-testid="storage-banner" />;
  },
}));

import Main from '../Main';

describe('Main', () => {
  it('renders StorageBlockedBanner and App', () => {
    render(<Main />);
    expect(screen.getByTestId('storage-banner')).toBeInTheDocument();
    expect(screen.getByTestId('app-stub')).toBeInTheDocument();
  });
});
