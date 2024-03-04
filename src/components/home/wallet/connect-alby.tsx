import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { GetInfoResponse } from 'webln';
import { useAppHandlingContext } from '../../../contexts/app-handling.context';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType } from '../../../contexts/wallet.context';
import { useAlby } from '../../../hooks/wallets/alby.hook';
import { AbortError } from '../../../util/abort-error';
import { delay, url } from '../../../util/utils';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

export default function ConnectAlby(props: ConnectProps): JSX.Element {
  const { redirectPath, params: appParams } = useAppHandlingContext();
  const { isInstalled, enable, signMessage } = useAlby();

  async function getAccount(): Promise<Account> {
    const account = await enable();
    if (!account) throw new Error('Permission denied or account not verified');

    return { address: await getAlbyAddress(account) };
  }

  async function getAlbyAddress(account: GetInfoResponse): Promise<string> {
    if (account.node?.pubkey) {
      // log in with pub key
      return `LNNID${account.node.pubkey.toUpperCase()}`;
    } else if (account.node?.alias?.includes('getalby.com')) {
      // log in with Alby
      const win: Window = window;
      const redirectUrl = new URL(win.location.href);
      redirectUrl.searchParams.set('type', WalletType.ALBY);
      redirectPath && redirectUrl.searchParams.set('redirect', redirectPath);

      const params = new URLSearchParams({ redirectUri: redirectUrl.toString() });
      appParams.wallet && params.set('wallet', appParams.wallet);
      appParams.refcode && params.set('usedRef', appParams.refcode);

      win.location = url(`${process.env.REACT_APP_API_URL}/${process.env.REACT_APP_API_VERSION}/auth/alby`, params);

      await delay(5);
      throw new AbortError('Forwarded to Alby page');
    }

    throw new Error('No login method found');
  }

  return (
    <ConnectBase
      isSupported={isInstalled}
      getAccount={getAccount}
      signMessage={(msg) => signMessage(msg)}
      renderContent={Content}
      autoConnect
      {...props}
    />
  );
}

function Content({ back, error }: ConnectContentProps): JSX.Element {
  const { translate } = useSettingsContext();

  return error ? (
    <>
      <ConnectError error={error} />

      <StyledButton
        className="mt-4"
        label={translate('general/actions', 'Back')}
        onClick={back}
        color={StyledButtonColor.GRAY_OUTLINE}
        width={StyledButtonWidth.MIN}
      />
    </>
  ) : (
    <>
      <div className="mb-4">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Please confirm the connection in the Alby browser extension.')}
      </p>
    </>
  );
}
