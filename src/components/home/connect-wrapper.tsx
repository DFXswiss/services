import { lazy } from 'react';
import { WalletType } from '../../contexts/wallet.context';
import { ConnectProps } from './connect-shared';

const ConnectAlby = lazy(() => import('./wallet/connect-alby'));
const ConnectBitbox = lazy(() => import('./wallet/connect-bitbox'));
const ConnectCli = lazy(() => import('./wallet/connect-cli'));
const ConnectLedger = lazy(() => import('./wallet/connect-ledger'));
const ConnectMetaMask = lazy(() => import('./wallet/connect-metamask'));
const ConnectTrezor = lazy(() => import('./wallet/connect-trezor'));
const ConnectTaro = lazy(() => import('./wallet/connect-taro'));
const ConnectWalletConnect = lazy(() => import('./wallet/connect-wallet-connect'));
const ConnectMonero = lazy(() => import('./wallet/connect-monero'));
const ConnectMail = lazy(() => import('./wallet/connect-mail'));

export function ConnectWrapper(props: ConnectProps): JSX.Element {
  switch (props.wallet) {
    case WalletType.META_MASK:
      return <ConnectMetaMask {...props} />;

    case WalletType.ALBY:
      return <ConnectAlby {...props} />;

    case WalletType.LEDGER_BTC:
    case WalletType.LEDGER_ETH:
      return <ConnectLedger {...props} wallet={props.wallet} />;

    case WalletType.BITBOX_BTC:
    case WalletType.BITBOX_ETH:
      return <ConnectBitbox {...props} wallet={props.wallet} />;

    case WalletType.TREZOR_BTC:
    case WalletType.TREZOR_ETH:
      return <ConnectTrezor {...props} wallet={props.wallet} />;

    case WalletType.CLI_BTC:
    case WalletType.CLI_XMR:
    case WalletType.CLI_ETH:
      return <ConnectCli {...props} />;

    case WalletType.DFX_TARO:
      return <ConnectTaro {...props} />;

    case WalletType.WALLET_CONNECT:
      return <ConnectWalletConnect {...props} />;

    case WalletType.CAKE:
    case WalletType.MONERO:
      return <ConnectMonero {...props} wallet={props.wallet} />;

    case WalletType.MAIL:
      return <ConnectMail {...props} />;
  }
}
