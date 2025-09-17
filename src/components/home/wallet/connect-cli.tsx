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
import { WalletBlockchains, WalletType, useWalletContext } from '../../../contexts/wallet.context';
import { useAppParams } from '../../../hooks/app-params.hook';
import { useBlockchain } from '../../../hooks/blockchain.hook';
import { useClipboard } from '../../../hooks/clipboard.hook';
import { Lnurl } from '../../../util/lnurl';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

interface FormData {
  blockchain: Blockchain;
  address: string;
  signature: string;
  key?: string;
}

const Wallets = [
  WalletType.CLI_BTC,
  WalletType.CLI_LN,
  WalletType.CLI_ETH,
  WalletType.CLI_XMR,
  WalletType.CLI_ZANO,
  WalletType.CLI_ADA,
  WalletType.CLI_AR,
  WalletType.CLI_SOL,
  WalletType.CLI_TRX,
];

const SupportedBlockchains = Wallets.map((w) => WalletBlockchains[w])
  .filter((c) => c)
  .flat() as Blockchain[];

function encodeAddress(address: string): string {
  return /^\S+@\S+\.\S+$/.test(address) ? Lnurl.addressToLnurl(address) : address;
}

export default function ConnectCli(props: ConnectProps): JSX.Element {
  const { session } = useAuthContext();
  const { activeWallet } = useWalletContext();

  const form = useForm<FormData>({
    mode: 'onTouched',
    defaultValues: { blockchain: props.blockchain ?? SupportedBlockchains[0] },
  });

  async function getAccount(_w: WalletType, _b: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const values = form.getValues();
    values.address = encodeAddress(values.address);
    return values;
  }

  async function getSignature(): Promise<never> {
    throw new Error('Invalid signature call');
  }

  return (
    <ConnectBase
      isSupported={() => true}
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

function Content({ wallet, isConnecting, connect, error, form, onSwitch, rootRef }: ContentProps): JSX.Element {
  const { translate, translateError, language } = useSettingsContext();
  const { copy } = useClipboard();
  const { getSignMessage } = useAuth();
  const { toString } = useBlockchain();

  const addressRegex: { [wallet in WalletType]?: RegExp } = {
    [WalletType.CLI_BTC]: /^([13]|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/,
    [WalletType.CLI_LN]: /^((LNURL|LNDHUB)[A-Z0-9]{25,250}|LNNID[A-Z0-9]{66}|\S+@\S+\.\S+)$/,
    [WalletType.CLI_XMR]: /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/,
    [WalletType.CLI_ZANO]: /^(Z[a-zA-Z0-9]{96}|iZ[a-zA-Z0-9]{106})$/,
    [WalletType.CLI_ETH]: /^0x\w{40}$/,
    [WalletType.CLI_ADA]: /^stake[a-z0-9]{54}$/,
    [WalletType.CLI_AR]: /^[\w-]{43}$/,
    [WalletType.CLI_SOL]: /^[1-9A-HJ-NP-Za-km-z]{43,44}$/,
    [WalletType.CLI_TRX]: /^T[1-9A-HJ-NP-Za-km-z]{32,34}$/,
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
  const key = useWatch({ control, name: 'key' });
  const addressValid = validateAddress(address) === true;
  const { setParams } = useAppParams();

  const [signMessage, setSignMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const requiresKey = [Blockchain.CARDANO, Blockchain.ARWEAVE].includes(blockchain);
  const hasKey = !requiresKey || key;

  useEffect(() => {
    const newWallet = Wallets.find((w) => WalletBlockchains[w]?.includes(blockchain));
    if (newWallet && newWallet !== wallet) {
      onSwitch(newWallet);
      setParams({ blockchain });
    }
  }, [blockchain]);

  useEffect(() => {
    address && hasKey && trigger();

    if (addressValid && hasKey) {
      setIsLoading(true);
      getSignMessage(encodeAddress(address))
        .then(setSignMessage)
        .finally(() => setIsLoading(false));
    }
  }, [address, wallet, hasKey]);

  const rules = Utils.createRules({
    blockchain: Validations.Required,
    address: [Validations.Required, Validations.Custom(validateAddress)],
    signature: Validations.Required,
    key: requiresKey ? Validations.Required : undefined,
  });

  async function submit(): Promise<void> {
    await connect(blockchain);
  }

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(submit)} translate={translateError}>
      <StyledVerticalStack gap={6} full>
        <StyledDropdown
          rootRef={rootRef}
          name="blockchain"
          label={translate('screens/home', 'Blockchain')}
          disabled={isConnecting}
          full
          smallLabel
          items={SupportedBlockchains}
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

        {requiresKey && (
          <StyledInput
            name="key"
            autocomplete="publickey"
            label={translate('screens/home', 'Key')}
            disabled={isConnecting}
            full
            smallLabel
          />
        )}

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
              type="password"
              name="signature"
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
