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

  const [selectedType, setSelectedType] = useState<BitcoinAddressType>();

  const [createAddressPromise, addressPromise] = useDeferredPromise<Account>();

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const address = await connect(props.wallet, BitcoinAddressType.NATIVE_SEGWIT);
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
      3,
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
      signMessage={(msg, _a, _b, index, type) =>
        signMessage(msg, props.wallet, index ?? 0, type ?? BitcoinAddressType.NATIVE_SEGWIT)
      }
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

function Content({
  connect,
  isConnecting,
  addresses,
  onAddressSelect,
  onLoadAddresses,
  addressLoading,
  error,
  wallet,
}: ConnectContentProps & {
  addressLoading: boolean;
  wallet: WalletType;
} & {
  addresses?: string[];
  onAddressSelect: (type: BitcoinAddressType, address: Address) => void;
  onLoadAddresses: (type: BitcoinAddressType) => void;
}): JSX.Element {
  const app = wallet === WalletType.LEDGER_BTC ? 'Bitcoin' : 'Ethereum';

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
              className="my-4"
              isLoading={addressLoading}
              color={StyledButtonColor.STURDY_WHITE}
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
        <StyledButton
          label={translate('general/actions', addresses ? 'Next' : 'Connect')}
          onClick={
            addresses
              ? selectedAddress
                ? () => onAddressSelect(selectedType, selectedAddress)
                : () => undefined
              : () => connect()
          }
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={!addresses && isConnecting}
          disabled={!selectedAddress && addresses != null}
        />
      </StyledVerticalStack>
    </>
  );
}
