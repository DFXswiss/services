import { fireEvent, render, waitFor } from '@testing-library/react';
import { Blockchain } from '../../api/definitions/blockchain';
import { useMetaMask } from '../../hooks/metamask.hook';
import { useWalletContext, WalletContextProvider } from '../wallet.context';

jest.mock('../../hooks/metamask.hook');

const mockUseMetaMask = useMetaMask as jest.MockedFunction<typeof useMetaMask>;

const TestingComponent = (): JSX.Element => {
  const { isInstalled, isConnected, address, blockchain, signMessage, connect } = useWalletContext();

  return (
    <>
      <p data-testid="is-installed">{isInstalled?.toString()}</p>
      <p data-testid="is-connected">{isConnected?.toString()}</p>
      <p data-testid="address">{address}</p>
      <p data-testid="blockchain">{blockchain}</p>
      <button
        data-testid="sign-message"
        onClick={() =>
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          signMessage('a-test-sign-message', 'a-test-address').catch(() => {})
        }
      />
      <button
        data-testid="connect"
        onClick={() =>
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          connect().catch(() => {})
        }
      />
    </>
  );
};

interface MockInput {
  isInstalled?: boolean;
  address?: string;
  blockchain?: Blockchain;
}

interface Mock {
  isInstalled: boolean;
  register: jest.Mock<any, any>;
  requestAccount: jest.Mock<any, any>;
  requestBlockchain: jest.Mock<any, any>;
  requestBalance: jest.Mock<any, any>;
  sign: jest.Mock<any, any>;
}

interface Setup {
  isInstalled: HTMLElement;
  isConnected: HTMLElement;
  address: HTMLElement;
  blockchain: HTMLElement;
  signMessage: HTMLElement;
  connect: HTMLElement;

  register: jest.Mock<any, any>;
  requestAccount: jest.Mock<any, any>;
  requestBlockchain: jest.Mock<any, any>;
  requestBalance: jest.Mock<any, any>;
  sign: jest.Mock<any, any>;
}

describe('WalletContextProvider', () => {
  function mockAndRenderTestElements({
    isInstalled,
    register,
    requestAccount,
    requestBlockchain,
    requestBalance,
    sign,
  }: Mock): Setup {
    mockUseMetaMask.mockImplementation(() => ({
      isInstalled,
      register,
      requestAccount,
      requestBlockchain,
      requestBalance,
      sign,
    }));

    const { getByTestId } = render(
      <WalletContextProvider>
        <TestingComponent />
      </WalletContextProvider>,
    );

    return {
      isInstalled: getByTestId('is-installed'),
      isConnected: getByTestId('is-connected'),
      address: getByTestId('address'),
      blockchain: getByTestId('blockchain'),
      connect: getByTestId('connect'),
      signMessage: getByTestId('sign-message'),
      register,
      requestAccount,
      requestBlockchain,
      requestBalance,
      sign,
    };
  }

  function createMock({ isInstalled, address, blockchain }: MockInput = {}): Mock {
    return {
      isInstalled: isInstalled ?? true,
      register: jest.fn(),
      requestAccount: jest.fn(() => address),
      requestBlockchain: jest.fn(() => blockchain),
      requestBalance: jest.fn(() => Promise.resolve('0')),
      sign: jest.fn(),
    };
  }

  const setup = {
    installed: (): Setup => {
      return mockAndRenderTestElements(createMock({ isInstalled: true }));
    },
    notInstalled: (): Setup => {
      return mockAndRenderTestElements(createMock({ isInstalled: false }));
    },
    connectSuccess: (): Setup => {
      return mockAndRenderTestElements(createMock({ address: 'test-address', blockchain: Blockchain.ETH }));
    },
    connectFail: (): Setup => {
      return mockAndRenderTestElements(createMock());
    },
    connected: (): Setup => {
      return mockAndRenderTestElements(createMock());
    },
  };

  it('should return is installed, not connected and an empty address if installed', () => {
    const { isInstalled, isConnected, address } = setup.installed();
    expect(isInstalled.textContent).toEqual('true');
    expect(isConnected.textContent).toEqual('false');
    expect(address.textContent).toEqual('');
  });

  it('should return not installed, not connected and an empty address if not installed', () => {
    const { isInstalled, isConnected, address } = setup.notInstalled();
    expect(isInstalled.textContent).toEqual('false');
    expect(isConnected.textContent).toEqual('false');
    expect(address.textContent).toEqual('');
  });

  it('should call register on creation', () => {
    const { register } = setup.installed();
    expect(register).toBeCalled();
  });

  it('should show address and blockchain if connect is successful', async () => {
    const { connect, address, blockchain, requestAccount, requestBlockchain } = setup.connectSuccess();
    fireEvent.click(connect);

    await waitFor(() => {
      expect(requestAccount).toBeCalled();
      expect(requestBlockchain).toBeCalled();
      expect(address.textContent).toEqual('test-address');
      expect(blockchain.textContent).toEqual(Blockchain.ETH);
    });
  });

  it('should not show address and blockchain if connect fails', async () => {
    const { connect, address, blockchain, requestAccount, requestBlockchain } = setup.connectFail();
    fireEvent.click(connect);

    await waitFor(() => {
      expect(requestAccount).toBeCalled();
      expect(requestBlockchain).toBeCalledTimes(0);
      expect(address.textContent).toEqual('');
      expect(blockchain.textContent).toEqual('');
    });
  });

  it('should call sign with address and message', async () => {
    const { signMessage, sign } = setup.connected();
    fireEvent.click(signMessage);

    await waitFor(() => {
      expect(sign).toBeCalledWith('a-test-address', 'a-test-sign-message');
    });
  });
});
