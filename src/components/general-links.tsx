import { useAuthContext } from '../api/contexts/auth.context';
import { useLanguageContext } from '../contexts/language.context';
import { StyledLink } from '../stories/StyledLink';

export function GeneralLinks(): JSX.Element {
  const { authenticationToken } = useAuthContext();
  const { translate } = useLanguageContext();
  return (
    <div className="flex flex-col text-center gap-2 md:flex-row md:gap-40 justify-center pt-4 pb-16 bg-dfxGray-300">
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
