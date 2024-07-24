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
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>();

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

  function onAddressSelect(accountIndex: number, type: BitcoinAddressType, address: Address) {
    addressPromise?.resolve({ ...address, accountIndex, type });
    setAddresses(undefined);
  }

  async function onLoadAddresses(accountIndex: number, type: BitcoinAddressType) {
    if (!chain) throw new Error('Blockchain not defined');

    setAddressLoading(true);
    if (type !== selectedType) setAddresses([]);
    if (accountIndex !== selectedAccountIndex) setAddresses([]);

    const loadAddresses = await fetchAddresses(
      props.wallet,
      chain,
      accountIndex,
      type,
      type !== selectedType || !addresses || accountIndex !== selectedAccountIndex ? 0 : addresses.length,
      10,
    ).catch((e) => {
      addressPromise?.reject(e);
      return [];
    });

    setSelectedType(type);
    setSelectedAccountIndex(accountIndex);
    setAddresses((a) => a?.concat(...loadAddresses));
    setAddressLoading(false);
  }

  return (
    <ConnectBase
      isSupported={isSupported}
      getAccount={getAccount}
      signMessage={(msg, _a, chain, accountIndex, index, type) =>
        signMessage(msg, props.wallet, chain, accountIndex ?? 0, type ?? defaultAddressType, index ?? 0)
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
  onAddressSelect: (accountIndex: number, type: BitcoinAddressType, address: Address) => void;
  onLoadAddresses: (accountIndex: number, type: BitcoinAddressType) => void;
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
  const { control, setValue } = useForm<{ type: BitcoinAddressType; address?: Address; accountIndex: number }>({
    defaultValues: { type: defaultAddressType, accountIndex: 0 },
  });

  const selectedType = useWatch({ control, name: 'type' });
  const selectedAddress = useWatch({ control, name: 'address' });
  const selectedAccountIndex = useWatch({ control, name: 'accountIndex' });

  useEffect(() => {
    if (addresses?.length == 1) setValue('address', { address: addresses[0], index: 0 });
  }, [addresses]);

  useEffect(() => {
    if (addresses?.length) {
      setValue('address', undefined);
      onLoadAddresses(selectedAccountIndex, selectedType);
    }
  }, [selectedAccountIndex, selectedType]);

  const connectSteps = [
    'Connect your {{device}} with your computer',
    'Click on "Connect"',
    'Enter your password on your BitBox',
    'Confirm the pairing code',
    'Click on "Continue"',
    'Confirm "Sign message" on your {{device}}',
  ];

  const pairSteps = [
    'Check that the pairing code below matches the one displayed on your BitBox',
    'Confirm the pairing code on your BitBox',
  ];

  const steps = pairingCode ? pairSteps : connectSteps;

  return (
    <>
      <Form control={control} errors={{}}>
        <StyledVerticalStack gap={5} center full>
          {addresses ? (
            <>
              {wallet === WalletType.BITBOX_BTC && (
                <>
                  <StyledDropdown<BitcoinAddressType>
                    rootRef={rootRef}
                    label={translate('screens/home', 'Address type')}
                    name="type"
                    items={addressTypes}
                    labelFunc={(item) => item}
                    full
                    disabled={addressLoading}
                  />
                  <StyledDropdown<number>
                    rootRef={rootRef}
                    name="accountIndex"
                    items={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                    labelFunc={(item) => item.toString()}
                    full
                    disabled={addressLoading}
                    placeholder={translate('general/actions', 'Select...')}
                    label={translate('screens/home', 'Account index')}
                  />
                </>
              )}
              <StyledDropdown<Address>
                rootRef={rootRef}
                name="address"
                items={addresses.map((a, i) => ({ address: a, index: i }))}
                labelFunc={(item) => item.address}
                descriptionFunc={(item) => `Index ${item.index}`}
                full
                disabled={addressLoading}
                placeholder={translate('general/actions', 'Select...')}
                label={translate('screens/home', 'Address index')}
              />
              <StyledButton
                width={StyledButtonWidth.MIN}
                label={translate('screens/home', 'Load more addresses')}
                onClick={() => onLoadAddresses(selectedAccountIndex, selectedType)}
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
              img={pairingCode ? undefined : 'https://content.dfx.swiss/img/v1/services/bitboxready_en.jpg'}
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
                      ? () => onAddressSelect(selectedAccountIndex, selectedType, selectedAddress)
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
      </Form>
    </>
  );
}
