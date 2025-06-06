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
const ConnectPhantom = lazy(() => import('./wallet/connect-phantom'));
const ConnectTrust = lazy(() => import('./wallet/connect-trust'));
const ConnectMail = lazy(() => import('./wallet/connect-mail'));
const ConnectAddress = lazy(() => import('./wallet/connect-address'));

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
    case WalletType.CLI_LN:
    case WalletType.CLI_XMR:
    case WalletType.CLI_ETH:
    case WalletType.CLI_ADA:
    case WalletType.CLI_AR:
    case WalletType.CLI_SOL:
      return <ConnectCli {...props} />;

    case WalletType.DFX_TARO:
      return <ConnectTaro {...props} />;

    case WalletType.WALLET_CONNECT:
      return <ConnectWalletConnect {...props} />;

    case WalletType.CAKE:
    case WalletType.MONERO:
      return <ConnectMonero {...props} wallet={props.wallet} />;

    case WalletType.PHANTOM_SOL:
      return <ConnectPhantom {...props} />;

    case WalletType.TRUST_SOL:
      return <ConnectTrust {...props} />;

    case WalletType.MAIL:
      return <ConnectMail {...props} />;

    case WalletType.ADDRESS:
      return <ConnectAddress {...props} />;
  }
}
