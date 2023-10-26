import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import { StyledButton, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { useDeferredPromise } from '../../../hooks/deferred-promise.hook';
import { BitboxWallet, useBitbox } from '../../../hooks/wallets/bitbox.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectInstructions, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.BITBOX_BTC]: [Blockchain.BITCOIN],
  [WalletType.BITBOX_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Props extends ConnectProps {
  wallet: BitboxWallet;
}

export default function ConnectBitbox(props: Props): JSX.Element {
  const { isSupported, connect, signMessage } = useBitbox();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const [pairingCode, setPairingCode] = useState<string>();
  const [createPairingPromise, pairingPromise] = useDeferredPromise<void>();

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    const address =
      isReconnect && session?.address
        ? session.address
        : await connect(props.wallet, onPairing).catch((e) => {
            setPairingCode(undefined);
            throw e;
          });
    return { address };
  }

  async function onPairing(code: string) {
    setPairingCode(code);
    return createPairingPromise();
  }

  function onPairingConfirmed() {
    pairingPromise?.resolve();
    setPairingCode(undefined);
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg) => signMessage(msg, props.wallet)}
      renderContent={(p) => <Content pairingCode={pairingCode} onPairingConfirmed={onPairingConfirmed} {...p} />}
      autoConnect={activeWallet === props.wallet}
      {...props}
    />
  );
}

function Content({
  connect,
  isConnecting,
  error,
  pairingCode,
  onPairingConfirmed,
}: ConnectContentProps & { pairingCode?: string; onPairingConfirmed: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  const connectSteps = [
    'Connect your {{device}} with your computer',
    'Click on "Connect"',
    'Enter your password on your BitBox',
    'Confirm the pairing code',
    'Confirm "Sign message" on your {{device}}',
  ];

  const pairSteps = [
    'Check that the pairing code below matches the one displayed on your BitBox',
    'Confirm the pairing code on your BitBox',
    'Click on "Continue"',
  ];

  const steps = pairingCode ? pairSteps : connectSteps;

  return (
    <>
      <StyledVerticalStack gap={5} center>
        <ConnectInstructions
          steps={steps}
          params={{ device: 'BitBox' }}
          img={pairingCode ? undefined : 'https://content.dfx.swiss/img/v1/services/bitboxready_en.png'}
        />

        {pairingCode && (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Pairing code')}:</h2>
            <p className="text-dfxGray-700">{pairingCode}</p>
          </div>
        )}

        {error && <ConnectError error={error} />}

        <StyledButton
          label={translate('general/actions', pairingCode ? 'Next' : 'Connect')}
          onClick={pairingCode ? onPairingConfirmed : () => connect()}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={!pairingCode && isConnecting}
        />
      </StyledVerticalStack>
    </>
  );
}
