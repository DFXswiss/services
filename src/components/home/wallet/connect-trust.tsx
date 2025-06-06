import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
} from '@dfx.swiss/react-components';
import { isMobile } from 'react-device-detect';
import { useTrust } from 'src/hooks/wallets/trust.hook';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType } from '../../../contexts/wallet.context';
import { ConnectBase } from '../connect-base';
import { Account, ConnectContentProps, ConnectError, ConnectProps } from '../connect-shared';

export default function ConnectTrust(props: Readonly<ConnectProps>): JSX.Element {
  const { isInstalled, connect, signMessage } = useTrust();
  const { session } = useAuthContext();

  async function getAccount(_w: WalletType, _b: Blockchain, isReconnect: boolean): Promise<Account> {
    if (isReconnect && session?.address) return { address: session.address };

    const currentAddress = await connect();

    return { address: currentAddress };
  }

  return (
    <ConnectBase
      isSupported={isInstalled}
      fallback={isMobile ? WalletType.TRUST_SOL : undefined}
      getAccount={getAccount}
      signMessage={(msg, addr) => signMessage(addr, msg)}
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
        {translate('screens/home', 'Please confirm the connection in your Trust Wallet.')}
      </p>
    </>
  );
}
