import { useEffect, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useUserContext } from '../api/contexts/user.context';
import { useSessionContext } from '../contexts/session.context';
import { useWalletContext } from '../contexts/wallet.context';
import { IconSizes, IconVariant } from '../stories/DfxIcon';
import DfxLogo from '../stories/DfxLogo';
import DfxTitleSection from '../stories/DfxTitleSection';
import DfxVideoHelpModalContent from '../stories/DfxVideoHelpModalContent';
import StyledVerticalStack from '../stories/layout-helpers/StyledVerticalStack';
import StyledButton, { StyledButtonColors, StyledButtonWidths } from '../stories/StyledButton';
import StyledIconButton from '../stories/StyledIconButton';
import { StyledLink } from '../stories/StyledLink';
import StyledModal, { StyledModalTypes, StyledModalWidths } from '../stories/StyledModal';
import StyledTabContainer, { StyledTabProps } from '../stories/StyledTabContainer';
import { useBuyTab } from './tabs/buy.tab';
import { UserBox } from './user-box';
import { WalletBox } from './wallet-box';

export function Main(): JSX.Element {
  const { isConnected } = useWalletContext();
  const { isProcessing, needsSignUp, login, signUp } = useSessionContext();
  const { register } = useUserContext();
  const [showsHelp, setShowsHelp] = useState(false);
  const [showsUserLink, setShowsUserLink] = useState(false);

  useEffect(() => {
    register(() => setShowsUserLink(true));
  });

  function buildComingSoonTab(title: string): StyledTabProps {
    return {
      title,
      deactivated: true,
      flagWord1: 'Coming',
      flagWord2: 'soon',
      content: undefined,
    };
  }

  return (
    <>
      {/* MODALS */}
      <StyledModal type={StyledModalTypes.ALERT} isVisible={needsSignUp}>
        <StyledVerticalStack>
          <h1>Terms and Conditions.</h1>
          <p>
            Please read our terms and conditions and click on ”Next” to confirm and to continue to the DFX Multichain
            Service.
          </p>
          <a
            className="underline underline-offset-2 pt-6 pb-4"
            target="_blank"
            href={process.env.REACT_APP_TNC_URL}
            rel="noopener noreferrer"
          >
            Terms and conditions DFX Swiss.
          </a>
          <div className="mx-auto">
            <StyledButton
              width={StyledButtonWidths.SM}
              color={StyledButtonColors.RED}
              label="Next"
              caps={false}
              onClick={() => signUp()}
              isLoading={isProcessing}
            />
          </div>
        </StyledVerticalStack>
      </StyledModal>
      <StyledModal onClose={setShowsHelp} isVisible={showsHelp} width={StyledModalWidths.FULL_WIDTH} heading="Help">
        <DfxVideoHelpModalContent
          title="Get started with the DFX Exchange"
          description="We are the crypto exchange you don't need to trust your funds. Your keys, your coins, here is how it works:"
          videoSources={[
            {
              vidSrc: 'https://content.dfx.swiss/video/2022-12-20_MetaMask-get-started.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/2022-12-20_MetaMask-Get-Started-Thumb.png',
              title: 'Get started with MetaMask:',
            },
            {
              vidSrc: 'https://content.dfx.swiss/video/2022-12-20_What-Is-DFX-Exchange.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/2022-12-20_What-Is-DFX-Exchange-Thumb.png',
              title: 'What is DFX Exchange?',
            },
            {
              vidSrc: 'https://content.dfx.swiss/video/2022-12-20_Exchange-How-To-Buy.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/2022-12-20_Exchange-How-To-Buy-Thumb.png',
              title: 'How to buy:',
            },
          ]}
          numCols={3}
        />
      </StyledModal>
      <StyledModal isVisible={showsUserLink} onClose={setShowsUserLink} type={StyledModalTypes.ALERT}>
        <StyledVerticalStack gap={4}>
          <h1>Welcome back!</h1>
          <p>
            It looks like you already have an account with DFX. We have just sent you an E-Mail. Click on the sent link
            to add the connected MetaMask address to your account. This way you don't need to go through KYC again.
          </p>
          <p>If you don't want to link this address to your account, simply ignore the E-Mail.</p>
          <div className="mx-auto">
            <StyledButton width={StyledButtonWidths.SM} onClick={() => setShowsUserLink(false)} label="Got it." />
          </div>
        </StyledVerticalStack>
      </StyledModal>
      {/* CONTENT */}
      <div className="text-center p-2 mt-4">
        <div className="max-w-6xl text-left mx-auto ">
          <div className="flex justify-between">
            <a target="_blank" href={process.env.REACT_APP_DFX_URL} rel="noopener noreferrer">
              <DfxLogo />
            </a>
            {!isMobile && (
              <div className={`flex ${isConnected ? 'gap-2' : 'gap-4'} items-center`}>
                {isConnected ? (
                  <p className="text-dfxRed-100">How to</p>
                ) : (
                  <StyledButton label="Connect to Metamask" onClick={login} />
                )}
                <StyledIconButton size={IconSizes.LG} icon={IconVariant.HELP} onClick={() => setShowsHelp(true)} />
              </div>
            )}
          </div>
          <div className="md:flex justify-between mt-6">
            <div className="basis-3/5 max-w-[50%] px-6 mx-auto md:mx-0">
              <DfxTitleSection heading="DFX Exchange" subheading="Buy • Sell • Convert" />
            </div>
            {!isMobile && (
              <aside className="basis-2/5 shrink-0 md:min-w-[470px] lg:min-w-[512px] mx-auto md:mx-0">
                <WalletBox />
                <UserBox />
              </aside>
            )}
          </div>
          {!isMobile ? (
            <StyledTabContainer tabs={[useBuyTab(), buildComingSoonTab('Sell'), buildComingSoonTab('Convert')]} />
          ) : (
            <>
              <p className="text-center py-12">
                Our DFX Exchange is not yet available on mobile. Visit the DFX Exchange via your computer's web browser.
              </p>
              <p className="text-center pb-24">Please check back later for the mobile version.</p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:gap-40 justify-center pb-4">
          <StyledLink label="Terms and conditions" url={process.env.REACT_APP_TNC_URL} />
          <StyledLink label="Privacy policy" url={process.env.REACT_APP_PPO_URL} />
          <StyledLink label="Imprint" url={process.env.REACT_APP_IMP_URL} />
          <StyledLink label="Proof of Origins of Funds" url={process.env.REACT_APP_POF_URL} />
        </div>
      </div>
    </>
  );
}
