import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { BitcoinAddressType } from '../../../config/key-path';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { useDeferredPromise } from '../../../hooks/deferred-promise.hook';
import { LedgerWallet, useLedger } from '../../../hooks/wallets/ledger.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectInstructions, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.LEDGER_BTC]: [Blockchain.BITCOIN],
  [WalletType.LEDGER_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Address {
  address: string;
  index: number;
}

interface Props extends ConnectProps {
  wallet: LedgerWallet;
}

export default function ConnectLedger(props: Props): JSX.Element {
  const { isSupported, connect, signMessage, fetchAddresses } = useLedger();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();
  const [addresses, setAddresses] = useState<string[]>();

  const [bitcoinAddressType, setBitcoinAddressType] = useState<BitcoinAddressType>(BitcoinAddressType.NATIVE_SEGWIT);
  const [createAddressPromise, addressPromise] = useDeferredPromise<Address>();

  const app = props.wallet === WalletType.LEDGER_BTC ? 'Bitcoin' : 'Ethereum';

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const address = await connect(props.wallet, bitcoinAddressType);
    setAddresses([address]);

    return createAddressPromise();
  }

  function onAddressSelect(address: Address) {
    addressPromise?.resolve(address);
    setAddresses(undefined);
  }

  async function onLoadAddresses() {
    const loadAddresses = await fetchAddresses(
      props.wallet,
      addresses ? addresses.length + 1 : 0,
      1,
      bitcoinAddressType,
    );
    setAddresses(addresses?.concat(...loadAddresses));
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg, _a, _b, index) => signMessage(msg, props.wallet, index ?? 0, bitcoinAddressType)}
      renderContent={(p) => (
        <Content
          addresses={addresses}
          onLoadAddresses={onLoadAddresses}
          onAddressSelect={onAddressSelect}
          app={app}
          {...p}
        />
      )}
      autoConnect={activeWallet === props.wallet}
      {...props}
    />
  );
}

function Content({
  connect,
  isConnecting,
  addresses,
  onAddressSelect,
  onLoadAddresses,
  error,
  app,
}: ConnectContentProps & { app: string } & {
  addresses?: string[];
  onAddressSelect: (address: Address) => void;
  onLoadAddresses: () => void;
}): JSX.Element {
  const { translate } = useSettingsContext();

  // form
  const { control, setValue } = useForm<{ address: Address }>();
  const { control: typeControl } = useForm<{ type: BitcoinAddressType }>({
    defaultValues: { type: BitcoinAddressType.NATIVE_SEGWIT },
  });

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (addresses?.length == 1) setValue('address', { address: addresses[0], index: 0 });
  });

  const steps = [
    'Connect your {{device}} with your computer',
    'Open the {{app}} app on your Ledger',
    'Click on "Connect"',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center>
        {addresses ? (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Your address')}</h2>
            <Form control={control} errors={{}}>
              <StyledDropdown<Address>
                name="address"
                items={addresses.map((a, i) => ({ address: a, index: i }))}
                labelFunc={(item) => item.address}
                descriptionFunc={(item) => `Index ${item.index}`}
                full
              />
              <StyledButton
                width={StyledButtonWidth.MD}
                label={translate('screens/buy', 'Load more addresses')}
                onClick={() => onLoadAddresses()}
                caps={false}
                className="my-4 hidden"
              />
            </Form>
          </div>
        ) : (
          <ConnectInstructions
            steps={steps}
            params={{ app, device: 'Ledger' }}
            img={
              addresses ? undefined : `https://content.dfx.swiss/img/v1/services/ledger${app.toLowerCase()}ready_en.png`
            }
          />
        )}
        {error && <ConnectError error={error} />}
        <Form control={typeControl} errors={{}}>
          <StyledDropdown<BitcoinAddressType>
            label={translate('general/actions', 'Address type')}
            name="type"
            items={Object.values(BitcoinAddressType)}
            labelFunc={(item) => item}
            full
          />
        </Form>
        {app === WalletType.LEDGER_BTC ?? (
          <StyledButton
            label={translate('general/actions', addresses ? 'Next' : 'Connect')}
            onClick={addresses ? () => onAddressSelect(selectedAddress) : () => connect()}
            width={StyledButtonWidth.MIN}
            className="self-center"
            isLoading={!addresses && isConnecting}
          />
        )}
      </StyledVerticalStack>
    </>
  );
}
