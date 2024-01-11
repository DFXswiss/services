import { Blockchain, Utils, Validations, useAuth, useAuthContext } from '@dfx.swiss/react';
import {
  CopyButton,
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { useBlockchain } from '../../../hooks/blockchain.hook';
import { useClipboard } from '../../../hooks/clipboard.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

const SupportedBlockchains: { [w in WalletType]?: Blockchain[] } = {
  [WalletType.CLI_BTC]: [Blockchain.BITCOIN],
  [WalletType.CLI_XMR]: [Blockchain.MONERO],
  [WalletType.CLI_ETH]: [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BINANCE_SMART_CHAIN,
  ],
};

interface FormData {
  blockchain: Blockchain;
  address: string;
  signature: string;
}

export default function ConnectCli(props: ConnectProps): JSX.Element {
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const form = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { blockchain: props.blockchain ?? SupportedBlockchains[props.wallet]?.[0] },
  });

  async function getAccount(_: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    return form.getValues();
  }

  async function getSignature(): Promise<never> {
    throw new Error('Invalid signature call');
  }

  return (
    <ConnectBase
      isSupported={() => true}
      supportedBlockchains={SupportedBlockchains}
      getAccount={getAccount}
      signMessage={getSignature}
      renderContent={(p) => <Content wallet={props.wallet} form={form} {...p} />}
      autoConnect={activeWallet === props.wallet}
      {...props}
    />
  );
}

interface ContentProps extends ConnectContentProps {
  wallet: WalletType;
  form: UseFormReturn<FormData, any>;
}

function Content({ wallet, isConnecting, connect, error, form, onSwitch }: ContentProps): JSX.Element {
  const { translate, translateError, language } = useSettingsContext();
  const { copy } = useClipboard();
  const { getSignMessage } = useAuth();
  const { toString } = useBlockchain();

  const addressRegex: { [wallet in WalletType]?: RegExp } = {
    [WalletType.CLI_BTC]: /^([13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/,
    [WalletType.CLI_XMR]: /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/,
    [WalletType.CLI_ETH]: /^0x\w{40}$/,
  };

  function validateAddress(address: string): true | string {
    const regex = addressRegex[wallet];
    return regex && regex.test(address) ? true : 'pattern';
  }

  const {
    control,
    handleSubmit,
    trigger,
    formState: { isValid, errors },
  } = form;
  const blockchain = useWatch({ control, name: 'blockchain' });
  const address = useWatch({ control, name: 'address' });
  const addressValid = validateAddress(address) === true;

  const [signMessage, setSignMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const newWallet = Object.entries(SupportedBlockchains).find(([_, chains]) => chains.includes(blockchain))?.[0] as
      | WalletType
      | undefined;
    newWallet && onSwitch(newWallet);
  }, [blockchain]);

  useEffect(() => {
    address && trigger();

    if (addressValid) {
      setIsLoading(true);
      getSignMessage(address)
        .then(setSignMessage)
        .finally(() => setIsLoading(false));
    }
  }, [address, wallet]);

  const rules = Utils.createRules({
    blockchain: [Validations.Required],
    address: [Validations.Required, Validations.Custom(validateAddress)],
    signature: [Validations.Required],
  });

  async function submit(): Promise<void> {
    await connect();
  }

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(submit)} translate={translateError}>
      <StyledVerticalStack gap={6} full>
        <StyledDropdown
          name="blockchain"
          label={translate('screens/home', 'Blockchain')}
          disabled={isConnecting}
          full
          smallLabel
          items={Object.values(SupportedBlockchains).flat()}
          labelFunc={toString}
        />

        <StyledInput
          name="address"
          autocomplete="address"
          label={translate('screens/home', 'Address')}
          disabled={isConnecting}
          full
          smallLabel
        />

        {addressValid && signMessage && (
          <>
            <div>
              <p className="text-dfxBlue-800 font-semibold text-sm">{translate('screens/home', 'Sign message')}</p>
              <StyledHorizontalStack gap={2} center>
                <p className="text-dfxBlue-800 min-w-0 break-words">{signMessage}</p>
                <CopyButton onCopy={() => copy(signMessage)} />
              </StyledHorizontalStack>
            </div>

            <StyledInput
              name="signature"
              autocomplete="password"
              label={translate('screens/home', 'Signature')}
              disabled={isConnecting}
              full
              smallLabel
            />
          </>
        )}

        {error && <ConnectError error={error} />}

        <StyledButton
          type="submit"
          disabled={!isValid}
          label={translate('general/actions', 'Login')}
          onClick={handleSubmit(submit)}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isConnecting || isLoading}
        />

        <StyledLink
          label={translate('screens/home', 'Instructions')}
          url={`https://docs.dfx.swiss/${language?.symbol.toLowerCase() ?? 'en'}/faq.html#command-line-login`}
          dark
        />
      </StyledVerticalStack>
    </Form>
  );
}
