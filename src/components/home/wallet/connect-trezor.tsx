import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
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
import { TrezorWallet, useTrezor } from '../../../hooks/wallets/trezor.hook';
import { ConnectBase } from '../connect-base';
import {
  Account,
  Address,
  ConnectContentProps,
  ConnectError,
  ConnectInstructions,
  ConnectProps,
} from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.TREZOR_BTC]: [Blockchain.BITCOIN],
  [WalletType.TREZOR_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Props extends ConnectProps {
  wallet: TrezorWallet;
}

export default function ConnectTrezor(props: Props): JSX.Element {
  const { isSupported, defaultAddressType, connect, signMessage, fetchAddresses } = useTrezor();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const [addresses, setAddresses] = useState<string[]>();
  const [addressLoading, setAddressLoading] = useState(false);
  const [createAddressPromise, addressPromise] = useDeferredPromise<Account>();
  const [selectedType, setSelectedType] = useState<BitcoinAddressType>();

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const address = await connect(props.wallet, defaultAddressType);
    setAddresses([address]);

    return createAddressPromise();
  }

  function onAddressSelect(type: BitcoinAddressType, address: Address) {
    addressPromise?.resolve({ ...address, type });
    setAddresses(undefined);
  }

  async function onLoadAddresses(type: BitcoinAddressType) {
    setAddressLoading(true);
    if (type !== selectedType) setAddresses([]);

    const loadAddresses = await fetchAddresses(
      props.wallet,
      type !== selectedType || !addresses ? 0 : addresses.length,
      10,
      type,
    );

    setSelectedType(type);
    setAddresses((a) => a?.concat(...loadAddresses));
    setAddressLoading(false);
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg, _a, _b, index, type) => signMessage(msg, props.wallet, index ?? 0, type ?? defaultAddressType)}
      renderContent={(p) => (
        <Content
          addresses={addresses}
          onLoadAddresses={onLoadAddresses}
          onAddressSelect={onAddressSelect}
          addressLoading={addressLoading}
          wallet={props.wallet}
          {...p}
        />
      )}
      autoConnect={activeWallet === props.wallet}
      {...props}
    />
  );
}

interface ContentProps extends ConnectContentProps {
  addressLoading: boolean;
  wallet: WalletType;
  addresses?: string[];
  onAddressSelect: (type: BitcoinAddressType, address: Address) => void;
  onLoadAddresses: (type: BitcoinAddressType) => void;
}

function Content({
  rootRef,
  connect,
  isConnecting,
  addresses,
  onAddressSelect,
  onLoadAddresses,
  addressLoading,
  error,
}: ContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { addressTypes, defaultAddressType } = useTrezor();

  // form
  const { control, setValue } = useForm<{ type: BitcoinAddressType; address?: Address }>({
    defaultValues: { type: defaultAddressType },
  });

  const selectedType = useWatch({ control, name: 'type' });
  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (addresses?.length == 1) setValue('address', { address: addresses[0], index: 0 });
  }, [addresses]);

  useEffect(() => {
    if (addresses?.length) {
      setValue('address', undefined);
      onLoadAddresses(selectedType);
    }
  }, [selectedType]);
  const steps = [
    'Connect your {{device}} with your computer',
    'Click on "Continue in Trezor Connect"',
    'Follow the steps in the Trezor Connect website',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center full>
        {addresses ? (
          <>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Choose an address')}</h2>
            <Form control={control} errors={{}}>
              <StyledDropdown<BitcoinAddressType>
                rootRef={rootRef}
                label={translate('screens/home', 'Address type')}
                name="type"
                items={addressTypes}
                labelFunc={(item) => item}
                full
                disabled={addressLoading}
              />

              <StyledDropdown<Address>
                rootRef={rootRef}
                name="address"
                items={addresses.map((a, i) => ({ address: a, index: i }))}
                labelFunc={(item) => item.address}
                descriptionFunc={(item) => `Index ${item.index}`}
                full
                disabled={addressLoading}
                placeholder={translate('general/actions', 'Please select...')}
                label={translate('screens/home', 'Address index')}
              />
            </Form>
            <StyledButton
              width={StyledButtonWidth.MIN}
              label={translate('screens/home', 'Load more addresses')}
              onClick={() => onLoadAddresses(selectedType)}
              caps={false}
              className="my-4"
              isLoading={addressLoading}
              color={StyledButtonColor.STURDY_WHITE}
            />
          </>
        ) : (
          <ConnectInstructions
            steps={steps}
            params={{ device: 'Trezor' }}
            img={addresses ? undefined : 'https://content.dfx.swiss/img/v1/services/trezorready_en.png'}
          />
        )}

        {error && <ConnectError error={error} />}

        <StyledButton
          label={translate('general/actions', 'Continue in Trezor Connect')}
          onClick={
            addresses
              ? selectedAddress
                ? () => onAddressSelect(selectedType, selectedAddress)
                : () => undefined
              : () => connect()
          }
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isConnecting && !addresses}
          disabled={addresses && !selectedAddress}
        />
      </StyledVerticalStack>
    </>
  );
}
