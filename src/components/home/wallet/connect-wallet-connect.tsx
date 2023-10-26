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
import { DeepWallet, useWalletConnect } from '../../../hooks/wallets/wallet-connect.hook';
import { QrCopy } from '../../payment/qr-copy';
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
  const { connect, signMessage, wallets } = useWalletConnect();
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
      renderContent={(p) => <Content connectUri={connectUri} wallets={wallets} {...p} />}
      autoConnect
      {...props}
    />
  );
}

function Content({
  back,
  error,
  connectUri,
  wallets,
}: ConnectContentProps & { connectUri?: string; wallets: DeepWallet[] }): JSX.Element {
  const { translate } = useSettingsContext();

  return connectUri ? (
    <>
      <h2 className="text-dfxGray-700 mb-4">{translate('screens/home', 'Scan with your wallet')}</h2>
      <QrCopy data={connectUri} />

      {wallets.length && (
        <>
          <h2 className="text-dfxGray-700 mt-8 mb-4 ">{translate('screens/home', 'Connect your wallet')}</h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-5 w-full mb-3">
            {wallets.map((w) => (
              <WalletComponent key={w.id} wallet={w} />
            ))}
          </div>
        </>
      )}
    </>
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
      <p className="text-dfxGray-700">{translate('screens/home', 'Please confirm the connection in your wallet.')}</p>
    </>
  );
}

function WalletComponent({ wallet }: { wallet: DeepWallet }): JSX.Element {
  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden"
        style={{ borderRadius: '20%', boxShadow: '0px 0px 5px 3px rgba(0, 0, 0, 0.25)' }}
      >
        <img
          src={wallet.imageUrl}
          className={'cursor-pointer h-full'}
          onClick={() => window.open(wallet.deepLink, '_self')}
        />
      </div>
      <div className="text-dfxGray-700 text-sm mt-1 text-ellipsis overflow-hidden whitespace-nowrap">{wallet.name}</div>
    </div>
  );
}
