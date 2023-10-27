import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { Control, useForm, useWatch } from 'react-hook-form';
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
  const [addressLoading, setAddressLoading] = useState(false);

  const { control: typeControl } = useForm<{ type: BitcoinAddressType }>({
    defaultValues: { type: BitcoinAddressType.NATIVE_SEGWIT },
  });
  const selectedType = useWatch({ control: typeControl, name: 'type' });

  const [createAddressPromise, addressPromise] = useDeferredPromise<Address>();

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const address = await connect(props.wallet, selectedType);
    setAddresses([address]);

    return createAddressPromise();
  }

  function onAddressSelect(address: Address) {
    addressPromise?.resolve(address);
    setAddresses(undefined);
  }

  async function onLoadAddresses() {
    setAddressLoading(true);
    const loadAddresses = await fetchAddresses(props.wallet, addresses?.length ?? 0, 5, selectedType);
    setAddresses(addresses?.concat(...loadAddresses));
    setAddressLoading(false);
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg, _a, _b, index) => signMessage(msg, props.wallet, index ?? 0, selectedType)}
      renderContent={(p) => (
        <Content
          addresses={addresses}
          onLoadAddresses={onLoadAddresses}
          onAddressSelect={onAddressSelect}
          addressLoading={addressLoading}
          wallet={props.wallet}
          typeControl={typeControl}
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
  addressLoading,
  error,
  wallet,
  typeControl,
}: ConnectContentProps & {
  addressLoading: boolean;
  wallet: WalletType;
  typeControl: Control<{ type: BitcoinAddressType }>;
} & {
  addresses?: string[];
  onAddressSelect: (address: Address) => void;
  onLoadAddresses: () => void;
}): JSX.Element {
  const app = wallet === WalletType.LEDGER_BTC ? 'Bitcoin' : 'Ethereum';

  const { translate } = useSettingsContext();

  // form
  const { control, setValue } = useForm<{ address: Address }>();

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (addresses?.length == 1) setValue('address', { address: addresses[0], index: 0 });
  }, [addresses]);

  const steps = [
    'Connect your {{device}} with your computer',
    'Open the {{app}} app on your Ledger',
    'Click on "Connect"',
    'Choose address',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center>
        {addresses ? (
          <>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Your address')}</h2>
            <Form control={control} errors={{}}>
              <StyledDropdown<Address>
                name="address"
                items={addresses.map((a, i) => ({ address: a, index: i }))}
                labelFunc={(item) => item.address}
                descriptionFunc={(item) => `Index ${item.index}`}
                full
              />
            </Form>
            <StyledButton
              width={StyledButtonWidth.MD}
              label={translate('screens/home', 'Load more addresses')}
              onClick={() => onLoadAddresses()}
              caps={false}
              className="my-4 "
              isLoading={addressLoading}
            />
          </>
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
        {wallet === WalletType.LEDGER_BTC && !addresses && (
          <Form control={typeControl} errors={{}}>
            <StyledDropdown<BitcoinAddressType>
              label={translate('screen/home', 'Address type')}
              name="type"
              items={Object.values(BitcoinAddressType)}
              labelFunc={(item) => item}
              descriptionFunc={() => selectedAddress?.address}
              full
              disabled={isConnecting}
            />
          </Form>
        )}
        <StyledButton
          label={translate('general/actions', addresses ? 'Next' : 'Connect')}
          onClick={addresses ? () => onAddressSelect(selectedAddress) : () => connect()}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={!addresses && isConnecting}
        />
      </StyledVerticalStack>
    </>
  );
}
