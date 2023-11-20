import { StyledButton, StyledButtonWidth, StyledLink, StyledVerticalStack } from '@dfx.swiss/react-components';
import { Trans } from 'react-i18next';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';

export function InstallHint({ type, onConfirm }: { type: WalletType; onConfirm: () => void }): JSX.Element {
  switch (type) {
    case WalletType.META_MASK:
      return <MetaMaskHint onConfirm={onConfirm} />;

    case WalletType.ALBY:
      return <AlbyHint onConfirm={onConfirm} />;

    case WalletType.LEDGER_BTC:
    case WalletType.LEDGER_ETH:
    case WalletType.BITBOX_BTC:
    case WalletType.BITBOX_ETH:
      return <WebHidHint onConfirm={onConfirm} />;

    case WalletType.TREZOR_BTC:
    case WalletType.TREZOR_ETH:
      return <TrezorHint onConfirm={onConfirm} />;

    case WalletType.CLI_BTC:
    case WalletType.CLI_XMR:
    case WalletType.CLI_ETH:
    case WalletType.DFX_TARO:
    case WalletType.WALLET_CONNECT:
      return <></>;
  }
}

function MetaMaskHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Please install MetaMask or Rabby!')}</h1>
      <p className="text-dfxGray-700">
        {translate(
          'screens/home',
          'You need to install the MetaMask or Rabby browser extension to be able to use this service.',
        )}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <MetaMaskLink /> for more details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function MetaMaskLink(): JSX.Element {
  return (
    <>
      <StyledLink label="metamask.io" url="https://metamask.io" dark /> /{' '}
      <StyledLink label="rabby.io" url="https://rabby.io/" dark />
    </>
  );
}

function AlbyHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Please install Alby!')}</h1>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'You need to install the Alby browser extension to be able to use this service.')}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <StyledLink label="getalby.com" url="https://getalby.com/" dark /> for more details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function WebHidHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Browser not supported!')}</h1>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Please use a compatible browser (e.g. Chrome) to be able to use this service.')}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <StyledLink label="caniuse.com" url="https://caniuse.com/webhid" dark /> for more details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}

function TrezorHint({ onConfirm }: { onConfirm: () => void }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <StyledVerticalStack gap={4}>
      <h1 className="text-dfxGray-700">{translate('screens/home', 'Trezor Bridge not installed!')}</h1>
      <p className="text-dfxGray-700">
        {translate('screens/home', 'Please install the Trezor Bridge to be able to use this service.')}{' '}
        <Trans i18nKey="screens/home.visit">
          Visit <StyledLink label="trezor.io" url="https://trezor.io/learn/a/what-is-trezor-bridge" dark /> for more
          details.
        </Trans>
      </p>

      <div className="mx-auto">
        <StyledButton width={StyledButtonWidth.SM} onClick={onConfirm} label={translate('general/actions', 'OK')} />
      </div>
    </StyledVerticalStack>
  );
}
