import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType } from '../../../contexts/wallet.context';
import { useWalletConnect } from '../../../hooks/wallets/wallet-connect.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.WALLET_CONNECT]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.BINANCE_SMART_CHAIN,
  ],
};

export default function ConnectWalletConnect(props: ConnectProps): JSX.Element {
  const { connect, signMessage } = useWalletConnect();
  const { session } = useAuthContext();

  const [connectUri, setConnectUri] = useState<string>();

  async function getAccount(blockchain: Blockchain, isReconnect: boolean): Promise<Account> {
    const address =
      isReconnect && session?.address
        ? session.address
        : await connect(blockchain, setConnectUri).finally(() => setConnectUri(undefined));
    return { address };
  }

  return (
    <ConnectBase
      isSupported={() => true}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg, addr, chain) => signMessage(msg, addr, chain)}
      renderContent={(p) => <Content connectUri={connectUri} {...p} />}
      autoConnect
      {...props}
    />
  );
}

function Content({ back, error, connectUri }: ConnectContentProps & { connectUri?: string }): JSX.Element {
  const { translate } = useSettingsContext();

  const message = 'Please confirm the connection in your wallet.';

  return connectUri ? (
    <div>
      <p className="text-dfxGray-700">{connectUri}</p>
    </div>
  ) : error ? (
    <>
      <ConnectError error={error} />

      <StyledButton
        className="mt-4"
        label={translate('general/actions', 'Back')}
        onClick={back}
        color={StyledButtonColor.GRAY_OUTLINE}
        width={StyledButtonWidth.MIN}
      />
    </>
  ) : (
    <>
      <div className="mb-4">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
      <p className="text-dfxGray-700">{translate('screens/home', message)}</p>
    </>
  );
}
