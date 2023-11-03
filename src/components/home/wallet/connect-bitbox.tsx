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
import { BitboxWallet, useBitbox } from '../../../hooks/wallets/bitbox.hook';
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
  [WalletType.BITBOX_BTC]: [Blockchain.BITCOIN],
  [WalletType.BITBOX_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Props extends ConnectProps {
  wallet: BitboxWallet;
}

export default function ConnectBitbox(props: Props): JSX.Element {
  const { isSupported, defaultAddressType, connect, signMessage, fetchAddresses } = useBitbox();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const [chain, setChain] = useState<Blockchain>();
  const [addresses, setAddresses] = useState<string[]>();
  const [addressLoading, setAddressLoading] = useState(false);
  const [createAddressPromise, addressPromise] = useDeferredPromise<Account>();
  const [selectedType, setSelectedType] = useState<BitcoinAddressType>();
  const [pairingCode, setPairingCode] = useState<string>();

  async function getAccount(blockchain: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const address = await connect(props.wallet, blockchain, defaultAddressType, setPairingCode).finally(() =>
      setPairingCode(undefined),
    );

    setChain(blockchain);
    setAddresses([address]);

    return createAddressPromise();
  }

  function onAddressSelect(type: BitcoinAddressType, address: Address) {
    addressPromise?.resolve({ ...address, type });
    setAddresses(undefined);
  }

  async function onLoadAddresses(type: BitcoinAddressType) {
    if (!chain) throw new Error('Blockchain not defined');

    setAddressLoading(true);
    if (type !== selectedType) setAddresses([]);

    const loadAddresses = await fetchAddresses(
      props.wallet,
      chain,
      type,
      type !== selectedType || !addresses ? 0 : addresses.length,
      10,
    ).catch((e) => {
      addressPromise?.reject(e);
      return [];
    });

    setSelectedType(type);
    setAddresses((a) => a?.concat(...loadAddresses));
    setAddressLoading(false);
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={(msg, _a, chain, index, type) =>
        signMessage(msg, props.wallet, chain, type ?? defaultAddressType, index ?? 0)
      }
      renderContent={(p) => (
        <Content
          pairingCode={pairingCode}
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
  pairingCode?: string;
  wallet: WalletType;
  addressLoading: boolean;
  addresses?: string[];
  onAddressSelect: (type: BitcoinAddressType, address: Address) => void;
  onLoadAddresses: (type: BitcoinAddressType) => void;
}

function Content({
  rootRef,
  connect,
  isConnecting,
  addresses,
  error,
  pairingCode,
  wallet,
  onAddressSelect,
  onLoadAddresses,
  addressLoading,
}: ContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { addressTypes, defaultAddressType } = useBitbox();

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

  const connectSteps = [
    'Connect your {{device}} with your computer',
    'Click on "Connect"',
    'Enter your password on your BitBox',
    'Confirm the pairing code',
    'Choose an address',
    'Confirm "Sign message" on your {{device}}',
  ];

  const pairSteps = [
    'Check that the pairing code below matches the one displayed on your BitBox',
    'Confirm the pairing code on your BitBox',
  ];

  const steps = pairingCode ? pairSteps : connectSteps;

  return (
    <>
      <StyledVerticalStack gap={5} center full>
        {addresses ? (
          <>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Choose an address')}</h2>
            <Form control={control} errors={{}}>
              {wallet === WalletType.BITBOX_BTC && (
                <StyledDropdown<BitcoinAddressType>
                  rootRef={rootRef}
                  label={translate('screens/home', 'Address type')}
                  name="type"
                  items={addressTypes}
                  labelFunc={(item) => item}
                  full
                  disabled={addressLoading}
                />
              )}
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
              className="my-4 "
              isLoading={addressLoading}
              color={StyledButtonColor.STURDY_WHITE}
            />
          </>
        ) : (
          <ConnectInstructions
            steps={steps}
            params={{ device: 'BitBox' }}
            img={pairingCode ? undefined : 'https://content.dfx.swiss/img/v1/services/bitboxready_en.png'}
          />
        )}

        {pairingCode ? (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Pairing code')}:</h2>
            <p className="text-dfxGray-700">{pairingCode}</p>
          </div>
        ) : (
          <>
            {error && <ConnectError error={error} />}

            <StyledButton
              label={translate('general/actions', addresses ? 'Continue' : 'Connect')}
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
          </>
        )}
      </StyledVerticalStack>
    </>
  );
}
