import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
  StyledSearchInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { WalletType } from 'src/contexts/wallet.context';
import { useSettingsContext } from '../../../contexts/settings.context';
import { useResizeObserver } from '../../../hooks/resize-observer.hook';
import { DeepWallet, useWalletConnect } from '../../../hooks/wallets/wallet-connect.hook';
import { QrCopy } from '../../payment/qr-code';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

export default function ConnectWalletConnect(props: ConnectProps): JSX.Element {
  const { connect, signMessage, wallets } = useWalletConnect();
  const { session } = useAuthContext();

  const [connectUri, setConnectUri] = useState<string>();

  async function getAccount(_w: WalletType, blockchain: Blockchain, isReconnect: boolean): Promise<Account> {
    const address =
      isReconnect && session?.address
        ? session.address
        : await connect(blockchain, setConnectUri).finally(() => setConnectUri(undefined));

    return { address };
  }

  return (
    <ConnectBase
      isSupported={() => true}
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

  const containerRef = useResizeObserver<HTMLDivElement>((el) => setSize(el.offsetWidth));

  const [size, setSize] = useState<number>();
  const [filter, setFilter] = useState<string>();

  function walletFilter(wallet: DeepWallet): boolean {
    if (!filter) return true;

    const filters = filter.toLowerCase().split(' ');
    const walletWords = wallet.name.toLowerCase().split(' ');

    return filters.every((f) => walletWords.some((w) => w.includes(f)));
  }

  return connectUri ? (
    <>
      <h2 className="text-dfxGray-700 mb-4">{translate('screens/home', 'Scan with your wallet')}</h2>
      <QrCopy data={connectUri} />

      {wallets.length && (
        <StyledVerticalStack gap={4} full>
          <h2 className="text-dfxGray-700 mt-8">{translate('screens/home', 'Connect your wallet')}</h2>

          <StyledSearchInput onChange={setFilter} placeholder={translate('general/actions', 'Search') + '...'} />

          <div
            ref={containerRef}
            className={`grid ${size && size > 600 ? 'grid-cols-6' : 'grid-cols-4'} gap-5 w-full mb-3`}
          >
            {wallets.filter(walletFilter).map((w) => (
              <WalletComponent key={w.id} wallet={w} connectUri={connectUri} />
            ))}
          </div>
        </StyledVerticalStack>
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

function WalletComponent({ wallet, connectUri }: { wallet: DeepWallet; connectUri: string }): JSX.Element {
  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden"
        style={{ borderRadius: '20%', boxShadow: '0px 0px 5px 3px rgba(0, 0, 0, 0.25)' }}
      >
        <img
          src={wallet.imageUrl}
          className={'cursor-pointer h-full'}
          onClick={() => window.open(`${wallet.deepLink}wc?uri=${encodeURIComponent(connectUri)}`, '_self')}
        />
      </div>
      <div className="text-dfxGray-700 text-sm mt-1 text-ellipsis overflow-hidden whitespace-nowrap">{wallet.name}</div>
    </div>
  );
}
