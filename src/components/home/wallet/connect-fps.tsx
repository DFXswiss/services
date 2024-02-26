import { StyledButton, StyledButtonWidth, StyledLink, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { Trans } from 'react-i18next';
import { useSettingsContext } from '../../../contexts/settings.context';
import { ConnectProps } from '../connect-shared';

export default function ConnectFps(_: ConnectProps): JSX.Element {
  const { translate } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);

  function onClick() {
    setIsLoading(true);
    window.open('https://www.frankencoin.com/pool', '_self');
  }

  return (
    <StyledVerticalStack full center gap={6}>
      <p className="text-dfxGray-700">
        <Trans i18nKey={'screens/home.fps'}>
          Unfortunately, DFX.swiss does not offer the purchase and sale of FPS tokens. If you are still interested, you
          can visit the website{' '}
          <StyledLink url="https://www.frankencoin.com/pool" label="www.frankencoin.com/pool" dark /> using the button
          below.
        </Trans>
      </p>
      <p className="text-dfxGray-700">
        {translate(
          'screens/home',
          'The website allows you to interact with the Frankencoin smart contract and trade FPS tokens. Please note that this is not an offer from DFX, it is not a recommendation and it is in no way a solicitation to trade. With this message DFX only points out that this technical possibility exists, nothing more. It is imperative that you inform yourself about all the details beforehand and always be aware that you are always trading on your own responsibility.',
        )}
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
