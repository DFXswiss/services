import { StyledButton, StyledButtonWidth, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useSettingsContext } from '../../../contexts/settings.context';
import { WalletType } from '../../../contexts/wallet.context';
import { ConnectProps } from '../connect-shared';

const WalletProps = {
  [WalletType.CAKE]: {
    name: 'Cake Wallet',
    url: 'https://cakewallet.com',
  },
  [WalletType.MONERO]: {
    name: 'Monero.com',
    url: 'https://monero.com',
  },
};

interface Props extends ConnectProps {
  wallet: WalletType.CAKE | WalletType.MONERO;
}

export default function ConnectMonero({ wallet }: Props): JSX.Element {
  const { translate } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);

  function onClick() {
    setIsLoading(true);
    window.open(WalletProps[wallet].url, '_self');
  }

  return (
    <StyledVerticalStack full center gap={6}>
      <p className="text-dfxGray-700">
        {translate('screens/home', "Please install {{wallet}} from the wallet provider's website.", {
          wallet: WalletProps[wallet].name,
        })}
      </p>

      <StyledButton
        type="button"
        label={translate('screens/home', 'Open website')}
        onClick={onClick}
        width={StyledButtonWidth.MIN}
        className="self-center"
        isLoading={isLoading}
      />
    </StyledVerticalStack>
  );
}
