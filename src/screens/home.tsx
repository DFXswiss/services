import { useLanguageContext } from '../contexts/language.context';
import { StyledLink } from '../stories/StyledLink';
import { Navigation } from '../components/navigation';

export function Home(): JSX.Element {
  const { translate } = useLanguageContext();
  return (
    <>
      <Navigation />
      <div className="flex flex-col items-center text-center px-8 py-2 mt-4 h-container">
        <h2 className="text-dfxBlue-800">{translate('screens/main', 'DFX services')}</h2>
        <p className="text-dfxGray-700">
          {translate('screens/main', 'Buy and Sell cryptocurrencies with bank transfers.')}
        </p>
      </div>
      <div className="flex flex-col text-center gap-2 md:flex-row md:gap-40 justify-center pt-4 pb-16 bg-dfxGray-300">
        <StyledLink label="Terms and conditions" url={process.env.REACT_APP_TNC_URL} dark />
        <StyledLink label="Privacy policy" url={process.env.REACT_APP_PPO_URL} dark />
        <StyledLink label="Imprint" url={process.env.REACT_APP_IMP_URL} dark />
        <StyledLink label="Proof of Origins of Funds" url={process.env.REACT_APP_POF_URL} dark />
      </div>
    </>
  );
}
