import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { useBrowserExtension } from 'src/hooks/wallets/browser-extension.hook';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType } from '../../../contexts/wallet.context';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

export default function ConnectBrowserExtension(props: Readonly<ConnectProps>): JSX.Element {
  const { isInstalled, connect, signMessage, requestAccount, requestBlockchain, requestChangeToBlockchain } =
    useBrowserExtension();
  const { session } = useAuthContext();

  const evmBlockchains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.BINANCE_SMART_CHAIN,
  ];
  async function getAccount(walletType: WalletType, blockchain: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    if (evmBlockchains.includes(blockchain)) {
      const address = await requestAccount(blockchain);
      if (!address) throw new Error('Permission denied or account not verified');

      const currentBlockchain = requestBlockchain ? await requestBlockchain() : undefined;
      if (currentBlockchain && blockchain !== currentBlockchain) await requestChangeToBlockchain?.(blockchain);
      return { address };
    }

    const currentAddress = await connect(walletType, blockchain);

    return { address: currentAddress };
  }

  return (
    <ConnectBase
      isSupported={(wallet) => {
        return isInstalled(wallet);
      }}
      fallback={(wallet) => {
        return wallet;
      }}
      getAccount={(wallet, blockchain) => getAccount(wallet, blockchain, false)}
      signMessage={(msg, addr, wallet, blockchain) => signMessage(addr, msg, wallet, blockchain)}
      renderContent={Content}
      autoConnect
      {...props}
    />
  );
}

function Content({ back, error }: ConnectContentProps): JSX.Element {
  const { translate } = useSettingsContext();

  return error ? (
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
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Please confirm the connection in your browser extension.')}
      </p>
    </>
  );
}
