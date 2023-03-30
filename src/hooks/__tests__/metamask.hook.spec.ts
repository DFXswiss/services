import { useMetaMask } from '../metamask.hook';

describe('useMetaMask', () => {
  const setup = {
    installed: () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      (window as any).ethereum = { isMetaMask: true, on: () => {} };
    },
    notInstalled: () => {
      (window as any).ethereum = undefined;
    },
  };

  it('should return is installed, if installed', () => {
    setup.installed();
    const { isInstalled } = useMetaMask();
    expect(isInstalled).toBeTruthy();
  });

  it('should return is not installed, if not installed', () => {
    setup.notInstalled();
    const { isInstalled } = useMetaMask();
    expect(isInstalled).toBeFalsy();
  });
});
