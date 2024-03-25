import { Asset } from '@dfx.swiss/react';
import { StyledButton, StyledButtonWidth, StyledLink, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { Trans } from 'react-i18next';
import { useSettingsContext } from '../contexts/settings.context';

const PrivateAssets: { [symbol: string]: { name: string; url: string } } = {
  FPS: { name: 'Frankencoin', url: 'www.frankencoin.com/pool' },
  WFPS: { name: 'Frankencoin', url: 'www.frankencoin.com/pool' },
  Ebel2X: { name: 'Ebel2X', url: 'dhedge.org/vault/0xe137dd4bcd22e947c896ae33a0920c09c85e263d' },
};

export function PrivateAssetHint({ asset }: { asset: Asset }): JSX.Element {
  const { translate } = useSettingsContext();

  const [isLoading, setIsLoading] = useState(false);

  const token = asset.name;
  const tokenInfos = PrivateAssets[token];

  function onClick() {
    if (!tokenInfos) return;

    setIsLoading(true);
    window.open(`https://${tokenInfos.url}`, '_self');
  }

  return (
    <StyledVerticalStack full center gap={6}>
      <p className="text-dfxGray-700">
        {translate(
          'screens/home',
          'Unfortunately, DFX.swiss does not offer the purchase and sale of {{token}} tokens.',
          { token },
        )}{' '}
        {tokenInfos ? (
          <Trans i18nKey={'screens/home.private'}>
            If you are still interested, you can visit the website{' '}
            <StyledLink url={`https://${tokenInfos.url}`} label={tokenInfos.url} target="_self" dark /> using the button
            below.
          </Trans>
        ) : (
          translate('screens/home', 'If you are still interested, you can visit their website.')
        )}
      </p>
      {tokenInfos && (
        <>
          <p className="text-dfxGray-700">
            {translate(
              'screens/home',
              'The website allows you to interact with the {{name}} smart contract and trade {{symbol}} tokens. Please note that this is not an offer from DFX, it is not a recommendation and it is in no way a solicitation to trade. With this message DFX only points out that this technical possibility exists, nothing more. It is imperative that you inform yourself about all the details beforehand and always be aware that you are always trading on your own responsibility.',
              { symbol: token, name: tokenInfos.name },
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
        </>
      )}
    </StyledVerticalStack>
  );
}
