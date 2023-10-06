import { Blockchain } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';
import { useMetaMask } from '../../hooks/wallets/metamask.hook';
import { Connect } from './connect';

export interface ConnectProps {
  onLogin: () => void;
  onCancel: () => void;
}

export default function ConnectMetaMask(props: ConnectProps): JSX.Element {
  const { isInstalled, requestAccount, requestBlockchain, sign } = useMetaMask();

  async function getAccount(): Promise<{ address: string; blockchain: Blockchain }> {
    const address = await requestAccount();
    if (!address) throw new Error('Permission denied or account not verified');

    const blockchain = await requestBlockchain(); // TODO: what to do here?

    return { address, blockchain: blockchain as Blockchain };
  }

  return (
    <Connect
      wallet={WalletType.META_MASK}
      isSupported={isInstalled()}
      getAccount={getAccount}
      signMessage={sign}
      renderContent={Content}
      {...props}
    />
  );
}

function Content(back: () => void, connect: () => Promise<void>, isConnecting: boolean, error?: string): JSX.Element {
  // TODO: auto connect

  const { translate } = useSettingsContext();

  const message = 'Please confirm the connection in your MetaMask.';

  // TODO: shared component
  return error ? (
    <>
      <div>
        <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
        <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
      </div>

      <StyledButton
        className="mt-4"
        label={translate('general/actions', 'Back')}
        onClick={back}
        color={StyledButtonColor.GRAY_OUTLINE}
        width={StyledButtonWidth.MIN}
      />
    </>
  ) : isConnecting ? (
    <>
      <div className="mb-4">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
      <p className="text-dfxGray-700">{translate('screens/home', message)}</p>
    </>
  ) : (
    <StyledButton
      label={translate('general/actions', 'Connect')}
      onClick={() => connect()}
      width={StyledButtonWidth.MIN}
      className="self-center"
    />
  );
}
