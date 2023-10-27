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
import { Account, ConnectContentProps, ConnectError, ConnectInstructions, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.BITBOX_BTC]: [Blockchain.BITCOIN],
  [WalletType.BITBOX_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM],
};

interface Address {
  address: string;
  index: number;
}

interface Props extends ConnectProps {
  wallet: BitboxWallet;
}

export default function ConnectBitbox(props: Props): JSX.Element {
  const { isSupported, connect, signMessage, fetchAddresses } = useBitbox();
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();
  const [addresses, setAddresses] = useState<string[]>();
  const [addressLoading, setAddressLoading] = useState(false);

  const [selectedType, setSelectedType] = useState<BitcoinAddressType>();

  const [createAddressPromise, addressPromise] = useDeferredPromise<Account>();

  const [pairingCode, setPairingCode] = useState<string>();
  const [createPairingPromise, pairingPromise] = useDeferredPromise<void>();

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const address = await connect(props.wallet, onPairing, BitcoinAddressType.NATIVE_SEGWIT).catch((e) => {
      setPairingCode(undefined);
      throw e;
    });

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
      type !== selectedType ? 0 : addresses?.length ?? 0,
      10,
      type,
    );

    setSelectedType(type);
    setAddresses((a) => a?.concat(...loadAddresses));
    setAddressLoading(false);
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
      signMessage={(msg, _a, _b, index, type) =>
        signMessage(msg, props.wallet, index ?? 0, type ?? BitcoinAddressType.NATIVE_SEGWIT)
      }
      renderContent={(p) => (
        <Content
          pairingCode={pairingCode}
          onPairingConfirmed={onPairingConfirmed}
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

function Content({
  connect,
  isConnecting,
  addresses,
  error,
  pairingCode,
  onPairingConfirmed,
  wallet,
  onAddressSelect,
  onLoadAddresses,
  addressLoading,
}: ConnectContentProps & {
  onPairingConfirmed: () => void;
  pairingCode?: string;
} & { wallet: WalletType } & {
  addressLoading: boolean;
  addresses?: string[];
  onAddressSelect: (type: BitcoinAddressType, address: Address) => void;
  onLoadAddresses: (type: BitcoinAddressType) => void;
}): JSX.Element {
  const { translate } = useSettingsContext();

  // form
  const { control, setValue } = useForm<{ type: BitcoinAddressType; address?: Address }>({
    defaultValues: { type: BitcoinAddressType.NATIVE_SEGWIT },
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
    'Choose address',
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
        {addresses ? (
          <>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Choose address')}</h2>
            <Form control={control} errors={{}}>
              {wallet === WalletType.LEDGER_BTC && (
                <StyledDropdown<BitcoinAddressType>
                  label={translate('screen/home', 'Address type')}
                  name="type"
                  items={Object.values(BitcoinAddressType)}
                  labelFunc={(item) => item}
                  full
                  disabled={addressLoading}
                />
              )}
              <StyledDropdown<Address>
                name="address"
                items={addresses.map((a, i) => ({ address: a, index: i }))}
                labelFunc={(item) => item.address}
                descriptionFunc={(item) => `Index ${item.index}`}
                full
                disabled={addressLoading}
                placeholder={translate('general/actions', 'Please select...')}
                label={translate('screen/home', 'Address index')}
              />
            </Form>
            <StyledButton
              width={StyledButtonWidth.SM}
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

        {pairingCode && (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Pairing code')}:</h2>
            <p className="text-dfxGray-700">{pairingCode}</p>
          </div>
        )}

        {error && <ConnectError error={error} />}

        <StyledButton
          label={translate('general/actions', pairingCode || addresses ? 'Next' : 'Connect')}
          onClick={
            pairingCode
              ? onPairingConfirmed
              : addresses
              ? selectedAddress
                ? () => onAddressSelect(selectedType, selectedAddress)
                : () => undefined
              : () => connect()
          }
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={!pairingCode && !addresses && isConnecting}
          disabled={(!selectedAddress && addresses != null) || pairingCode != null}
        />
      </StyledVerticalStack>
    </>
  );
}
