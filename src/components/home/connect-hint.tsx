import {
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';

export interface ConnectHintProps {
  type: WalletType;
  isLoading: boolean;
  pairingCode?: string;
  onPairingConfirmed: () => void;
  error?: string;
  onBack: () => void;
  onRetry: () => void;
}

export function ConnectHint(props: ConnectHintProps): JSX.Element {
  const { type } = props;
  switch (type) {
    case WalletType.META_MASK:
    case WalletType.ALBY:
      const confirmMessage =
        type === WalletType.META_MASK
          ? 'Please confirm the connection in your MetaMask.'
          : 'Please confirm the connection in the Alby browser extension.';

      return <AutoConnectHint {...props} message={confirmMessage} />;

    case WalletType.LEDGER_BTC:
    case WalletType.LEDGER_ETH:
      const app = type === WalletType.LEDGER_BTC ? 'Bitcoin' : 'Ethereum';
      return <LedgerHint {...props} app={app} />;

    case WalletType.BITBOX_BTC:
    case WalletType.BITBOX_ETH:
      return <BitboxHint {...props} />;

    case WalletType.TREZOR_BTC:
    case WalletType.TREZOR_ETH:
      return <TrezorHint {...props} />;
  }
}

function AutoConnectHint({ error, onBack, message }: ConnectHintProps & { message: string }): JSX.Element {
  const { translate } = useSettingsContext();

  return error ? (
    <>
      <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
      <p className="text-dfxRed-150">{translate('screens/home', error)}</p>

      <StyledButton
        className="mt-4"
        label={translate('general/actions', 'Back')}
        onClick={onBack}
        color={StyledButtonColor.GRAY_OUTLINE}
        width={StyledButtonWidth.MIN}
      />
    </>
  ) : (
    <>
      <div className="mb-4">
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      </div>
      <p className="text-dfxGray-700">{translate('screens/home', message)}</p>
    </>
  );
}

function LedgerHint({ app, error, onRetry, isLoading }: ConnectHintProps & { app: string }): JSX.Element {
  const { translate } = useSettingsContext();

  const steps = [
    'Connect your {{device}} with your computer',
    'Open the {{app}} app on your Ledger',
    'Click on "Connect"',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center>
        <ol className="text-dfxBlue-800 text-left font-bold list-decimal ml-4 max-w-sm">
          {steps.map((s, i) => (
            <li key={i}>{translate('screens/home', s, { app, device: 'Ledger' })}</li>
          ))}
        </ol>

        <img
          src={`https://content.dfx.swiss/img/v1/services/ledger${app.toLowerCase()}ready_en.png`}
          className="w-full max-w-sm"
        />

        {error && (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
            <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
          </div>
        )}

        <StyledButton
          label={translate('general/actions', 'Connect')}
          onClick={onRetry}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isLoading}
        />
      </StyledVerticalStack>
    </>
  );
}

function BitboxHint({ pairingCode, onPairingConfirmed, error, onRetry, isLoading }: ConnectHintProps): JSX.Element {
  const { translate } = useSettingsContext();

  const connectSteps = [
    'Connect your {{device}} with your computer',
    'Click on "Connect"',
    'Enter your password on your BitBox',
    'Confirm the pairing code',
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
        <ol className="text-dfxBlue-800 text-left font-bold list-decimal ml-6 max-w-sm">
          {steps.map((s, i) => (
            <li key={i}>{translate('screens/home', s, { device: 'BitBox' })}</li>
          ))}
        </ol>

        {pairingCode ? (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Pairing code')}:</h2>
            <p className="text-dfxGray-700">{pairingCode}</p>
          </div>
        ) : (
          <img src={`https://content.dfx.swiss/img/v1/services/bitboxready_en.png`} className="w-full max-w-sm" />
        )}

        {error && (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
            <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
          </div>
        )}

        <StyledButton
          label={translate('general/actions', pairingCode ? 'Next' : 'Connect')}
          onClick={pairingCode ? onPairingConfirmed : onRetry}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={!pairingCode && isLoading}
        />
      </StyledVerticalStack>
    </>
  );
}

function TrezorHint({ error, onRetry, isLoading }: ConnectHintProps): JSX.Element {
  const { translate } = useSettingsContext();

  const steps = [
    'Connect your {{device}} with your computer',
    'Click on "Continue in Trezor Connect"',
    'Follow the steps in the Trezor Connect website',
    'Confirm "Sign message" on your {{device}}',
  ];

  return (
    <>
      <StyledVerticalStack gap={5} center>
        <ol className="text-dfxBlue-800 text-left font-bold list-decimal ml-4 max-w-sm">
          {steps.map((s, i) => (
            <li key={i}>{translate('screens/home', s, { device: 'Trezor' })}</li>
          ))}
        </ol>

        <img src="https://content.dfx.swiss/img/v1/services/trezorready_en.png" className="w-full max-w-sm" />

        {error && (
          <div>
            <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
            <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
          </div>
        )}

        <StyledButton
          label={translate('general/actions', 'Continue in Trezor Connect')}
          onClick={onRetry}
          width={StyledButtonWidth.MIN}
          className="self-center"
          isLoading={isLoading}
        />
      </StyledVerticalStack>
    </>
  );
}
