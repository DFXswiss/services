import { useAuthContext } from '@dfx.swiss/react';
import { StyledLink } from '@dfx.swiss/react-components';
import { useSettingsContext } from '../contexts/settings.context';

export function GeneralLinks(): JSX.Element {
  const { authenticationToken } = useAuthContext();
  const { translate } = useSettingsContext();

  return (
    <div className="flex flex-col text-center gap-2 md:flex-row justify-around py-4 bg-dfxGray-300">
      {authenticationToken && (
        <StyledLink
          label={translate('navigation/links', 'My DFX')}
          url={`${process.env.REACT_APP_PAY_URL}login?token=${authenticationToken}`}
          dark
        />
      )}
      <StyledLink
        label={translate('navigation/links', 'Terms and conditions')}
        url={process.env.REACT_APP_TNC_URL}
        dark
      />
      <StyledLink label={translate('navigation/links', 'Privacy policy')} url={process.env.REACT_APP_PPO_URL} dark />
      <StyledLink label={translate('navigation/links', 'Imprint')} url={process.env.REACT_APP_IMP_URL} dark />
    </div>
  );
}
