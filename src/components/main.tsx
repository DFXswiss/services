import { StyledLink } from '../stories/StyledLink';

export function Main(): JSX.Element {
  return (
    <div className="text-center p-2 mt-4">
      <div className="max-w-6xl text-left mx-auto ">
        <p>DFX services</p>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:gap-40 justify-center pb-4">
        <StyledLink label="Terms and conditions" url={process.env.REACT_APP_TNC_URL} />
        <StyledLink label="Privacy policy" url={process.env.REACT_APP_PPO_URL} />
        <StyledLink label="Imprint" url={process.env.REACT_APP_IMP_URL} />
        <StyledLink label="Proof of Origins of Funds" url={process.env.REACT_APP_POF_URL} />
      </div>
    </div>
  );
}
