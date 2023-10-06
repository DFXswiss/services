import { lazy } from 'react';
import { WalletType } from '../../contexts/wallet.context';
import { ConnectProps } from './connect-metamask';
const ConnectMetaMask = lazy(() => import('./connect-metamask'));

interface Props extends ConnectProps {
  wallet: WalletType;
}

export function ConnectWrapper({ wallet, ...props }: Props): JSX.Element {
  switch (wallet) {
    case WalletType.META_MASK:
      return <ConnectMetaMask {...props} />;

    case WalletType.ALBY:
    case WalletType.LEDGER_BTC:
    case WalletType.LEDGER_ETH:
    case WalletType.BITBOX_BTC:
    case WalletType.BITBOX_ETH:
    case WalletType.TREZOR_BTC:
    case WalletType.TREZOR_ETH:
    case WalletType.CLI_BTC:
    case WalletType.CLI_ETH:
    case WalletType.WALLET_CONNECT:
      return <></>;
  }
}
