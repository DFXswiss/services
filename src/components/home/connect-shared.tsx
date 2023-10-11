import { Blockchain } from '@dfx.swiss/react';
import { useSettingsContext } from '../../contexts/settings.context';
import { WalletType } from '../../contexts/wallet.context';

export interface Account {
  address: string;
  signature?: string;
}

export interface ConnectProps {
  wallet: WalletType;
  blockchain?: Blockchain;
  onLogin: () => void;
  onCancel: () => void;
}

export interface ConnectContentProps {
  back: () => void;
  connect: () => Promise<void>;
  isConnecting: boolean;
  error?: string;
}

export function ConnectError({ error }: { error: string }): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <div>
      <h2 className="text-dfxGray-700">{translate('screens/home', 'Connection failed!')}</h2>
      <p className="text-dfxRed-150">{translate('screens/home', error)}</p>
    </div>
  );
}

export function ConnectInstructions({
  steps,
  params,
  img,
}: {
  steps: string[];
  params: Record<string, string>;
  img?: string;
}): JSX.Element {
  const { translate } = useSettingsContext();

  return (
    <>
      <ol className="text-dfxBlue-800 text-left font-bold list-decimal ml-6 max-w-sm">
        {steps.map((s, i) => (
          <li key={i}>{translate('screens/home', s, params)}</li>
        ))}
      </ol>

      {img && <img src={img} className="w-full max-w-sm" />}
    </>
  );
}
