import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import { StyledButton, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { TrezorWallet, useTrezor } from '../../../hooks/wallets/trezor.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectInstructions, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.TREZOR_BTC]: [Blockchain.BITCOIN],
  [WalletType.TREZOR_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Props extends ConnectProps {
  wallet: TrezorWallet;
}

export default function ConnectTrezor(props: Props): JSX.Element {
  const { isSupported, connect, signMessage } = useTrezor();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

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
      renderContent={Content}
      autoConnect={activeWallet === props.wallet}
      {...props}
    />
  );
}

function Content({ connect, isConnecting, error }: ConnectContentProps): JSX.Element {
  const { translate } = useSettingsContext();

  const steps = [
    'Connect your {{device}} with your computer',
    'Click on "Continue in Trezor Connect"',
    'Follow the steps in the Trezor Connect website',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center>
        <ConnectInstructions
          steps={steps}
          params={{ device: 'Trezor' }}
          img="https://content.dfx.swiss/img/v1/services/trezorready_en.png"
        />

        {error && <ConnectError error={error} />}

        <StyledButton
          label={translate('general/actions', 'Continue in Trezor Connect')}
          onClick={() => connect()}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isConnecting}
        />
      </StyledVerticalStack>
    </>
  );
}
