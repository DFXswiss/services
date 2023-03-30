import { IconSizes, IconVariant } from './DfxIcon';
import DfxLogo from './DfxLogo';
import DfxTitleSection from './DfxTitleSection';
import StyledButton, { StyledButtonSizes, StyledButtonWidths } from './StyledButton';
import StyledDataBox from './StyledDataBox';
import StyledDataTextRow from './StyledDataTextRow';
import StyledTabContainer from './StyledTabContainer';
import StyledCoinList from './StyledCoinList';
import StyledCoinListItem from './StyledCoinListItem';
import StyledModal, { StyledModalWidths } from './StyledModal';
import { useState } from 'react';
import DfxVideoHelpModalContent from './DfxVideoHelpModalContent';
import StyledIconButton from './StyledIconButton';
import { Protocol } from '../hooks/blockchain.hook';
import { Asset } from '../api/definitions/asset';

const dummyAssets = {
  eth: { name: 'ETH', description: 'Ethereum', comingSoon: false },
  usdt: { name: 'USDT', description: 'Tether', comingSoon: false },
  usdc: { name: 'USDC', description: 'USD Coin', comingSoon: false },
  dfi: { name: 'DFI', description: 'DFI', comingSoon: false },
  bnb: { name: 'BNB', description: 'BNB', comingSoon: false },
  busd: { name: 'BUSD', description: 'Binance USD', comingSoon: false },
};

export default function DfxPageLayout() {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      {/* MODAL */}
      <StyledModal onClose={setShowHelpModal} isVisible={showHelpModal} width={StyledModalWidths.LARGE} heading="Help">
        <DfxVideoHelpModalContent
          title="Get started with the DFX Exchange"
          description="We are the crypto exchange you don't need to trust your funds. Your keys, your coins, here is how it works:"
          videoSources={[
            {
              vidSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp_thumb.png',
              title: 'Get started with MetaMask:',
            },
            {
              vidSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp_thumb.png',
              title: 'What is DFX Exchange?',
            },
            {
              vidSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp_thumb.png',
              title: 'How to buy:',
            },
            {
              vidSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp.mp4',
              thumbSrc: 'https://content.dfx.swiss/video/22-12-16_MetaMask_SetUp_thumb.png',
              title: 'Get started with MetaMask:',
            },
          ]}
          numCols={2}
        />
      </StyledModal>
      {/* CONTENT */}
      <div className="text-center p-2">
        <div className="max-w-6xl text-left mx-auto ">
          <div className="flex justify-between">
            <DfxLogo />
            <div className="flex gap-4">
              <StyledButton
                label="Connect to Metamask"
                onClick={() => {
                  console.log('clicked');
                }}
              />
              <StyledIconButton size={IconSizes.LG} icon={IconVariant.HELP} onClick={() => setShowHelpModal(true)} />
            </div>
          </div>
          <div className="md:flex justify-between mt-6">
            <div className="basis-3/5 max-w-[50%] px-6 mx-auto md:mx-0">
              <DfxTitleSection heading="DFX Multichain" subheading="Buy • Sell • Convert • Stake" />
            </div>
            <aside className="basis-2/5 shrink-0 md:min-w-[470px] lg:min-w-[512px] mx-auto md:mx-0">
              <StyledDataBox heading="Your wallet" boxButtonLabel="Log out" rightCornerHeading="0.9834 ETH">
                <StyledDataTextRow label="Metamask">Account1: 0x67242342...f1436</StyledDataTextRow>
                <StyledDataTextRow label="Connected to">Ethereum Mainnet</StyledDataTextRow>
              </StyledDataBox>
              <StyledDataBox heading="Your Data">
                <StyledDataTextRow label="E-mail address">john.doe@gmail.com</StyledDataTextRow>
                <StyledDataTextRow label="Your Referral Code">
                  008-802
                  <StyledButton
                    label="Copy link to share"
                    size={StyledButtonSizes.SMALL}
                    width={StyledButtonWidths.MIN}
                    caps={false}
                    onClick={() => {
                      console.log('button clicked.');
                    }}
                  />
                </StyledDataTextRow>
              </StyledDataBox>
            </aside>
          </div>
          <StyledTabContainer
            tabs={[
              {
                title: 'Buy',
                deactivated: false,
                icon: IconVariant.BANK,
                content: (
                  <>
                    <StyledCoinList heading="Ethereum mainnet · ERC-20 token">
                      <StyledCoinListItem
                        asset={dummyAssets.eth as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.ERC_20}
                      />
                      <StyledCoinListItem
                        asset={dummyAssets.usdt as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.ERC_20}
                      />
                      <StyledCoinListItem
                        asset={dummyAssets.usdc as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.ERC_20}
                      />
                      <StyledCoinListItem
                        asset={dummyAssets.dfi as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.ERC_20}
                      />
                    </StyledCoinList>
                    <StyledCoinList heading="Binance Smart Chain · BEP-20 token">
                      <StyledCoinListItem
                        asset={dummyAssets.busd as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.BEP_20}
                      />
                      <StyledCoinListItem
                        asset={dummyAssets.bnb as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.BEP_20}
                      />
                      <StyledCoinListItem
                        asset={dummyAssets.dfi as Asset}
                        onClick={() => {
                          console.log('clicked');
                        }}
                        protocol={Protocol.BEP_20}
                      />
                    </StyledCoinList>
                  </>
                ),
              },
              { title: 'Sell', deactivated: false, icon: IconVariant.WALLET, content: <h2>Tab2 : sell</h2> },
              {
                title: 'Convert',
                deactivated: false,
                flagWord1: 'Coming',
                flagWord2: 'Soon',
                content: <h2>Tab 3: convert</h2>,
              },
              { title: 'Stake', flagWord1: 'Beta', content: <h2>Tab4: Staking</h2> },
            ]}
          ></StyledTabContainer>
        </div>
      </div>
    </>
  );
}
