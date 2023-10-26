import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import { StyledButton, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { LedgerWallet, useLedger } from '../../../hooks/wallets/ledger.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectInstructions, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.LEDGER_BTC]: [Blockchain.BITCOIN],
  [WalletType.LEDGER_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Props extends ConnectProps {
  wallet: LedgerWallet;
}

export default function ConnectLedger(props: Props): JSX.Element {
  const { isSupported, connect, signMessage } = useLedger();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const app = props.wallet === WalletType.LEDGER_BTC ? 'Bitcoin' : 'Ethereum';

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    const address = isReconnect && session?.address ? session.address : await connect(props.wallet);
    return { address };
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg) => signMessage(msg, props.wallet)}
      renderContent={(p) => <Content app={app} {...p} />}
      autoConnect={activeWallet === props.wallet}
      {...props}
    />
  );
}

function Content({ connect, isConnecting, error, app }: ConnectContentProps & { app: string }): JSX.Element {
  const { translate } = useSettingsContext();

  const steps = [
    'Connect your {{device}} with your computer',
    'Open the {{app}} app on your Ledger',
    'Click on "Connect"',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center>
        <ConnectInstructions
          steps={steps}
          params={{ app, device: 'Ledger' }}
          img={`https://content.dfx.swiss/img/v1/services/ledger${app.toLowerCase()}ready_en.png`}
        />

        {error && <ConnectError error={error} />}

        <StyledButton
          label={translate('general/actions', 'Connect')}
          onClick={() => connect()}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isConnecting}
        />
      </StyledVerticalStack>
    </>
  );
}
