import { Blockchain, Utils, Validations, useAuth, useAuthContext } from '@dfx.swiss/react';
import {
  CopyButton,
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { UseFormReturn, useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { useClipboard } from '../../../hooks/clipboard.hook';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

const SupportedBlockchains = {
  [WalletType.CLI_BTC]: [Blockchain.BITCOIN],
  [WalletType.CLI_ETH]: [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.OPTIMISM, Blockchain.BINANCE_SMART_CHAIN],
};

interface FormData {
  address: string;
  signature: string;
}

export default function ConnectCli(props: ConnectProps): JSX.Element {
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const form = useForm<FormData>({ mode: 'onTouched' });

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

function Content({ wallet, isConnecting, connect, error, form }: ContentProps): JSX.Element {
  const { translate, language } = useSettingsContext();
  const { copy } = useClipboard();
  const { getSignMessage } = useAuth();

  const addressRegex = wallet === WalletType.CLI_BTC ? /^([13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/ : /^0x\w{40}$/;
  function validateAddress(address: string): true | string {
    return addressRegex.test(address) ? true : 'Invalid format';
  }

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = form;
  const address = useWatch({ control, name: 'address' });
  const addressValid = validateAddress(address) === true;

  const [signMessage, setSignMessage] = useState<string>();

  useEffect(() => {
    if (addressValid) getSignMessage(address).then(setSignMessage);
  }, [address]);

  const rules = Utils.createRules({
    address: [Validations.Required, Validations.Custom(validateAddress)],
    signature: [Validations.Required],
  });

  async function submit(): Promise<void> {
    await connect();
  }

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(submit)}>
      <StyledVerticalStack gap={6} full>
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
          disabled={!isValid}
          label={translate('general/actions', 'Login')}
          onClick={handleSubmit(submit)}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isConnecting}
        />

        <StyledLink
          label={translate('screens/home', 'Instructions')}
          url={`https://docs.dfx.swiss/${language?.symbol.toLowerCase() ?? 'en'}/faq`}
          dark
        />
      </StyledVerticalStack>
    </Form>
  );
}
