import DfxHelpContent from './DfxVideoHelpModalContent';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useState } from 'react';
import StyledButton from './StyledButton';

import StyledModal, { StyledModalWidths } from './StyledModal';

export default {
  title: 'Layout/DfxHelpModal',
  component: DfxHelpContent,
} as ComponentMeta<typeof DfxHelpContent>;

export const Default: ComponentStory<typeof DfxHelpContent> = (args) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      <StyledButton label="Get Help" onClick={() => setShowModal(true)}></StyledButton>
      <StyledModal onClose={setShowModal} isVisible={showModal} width={StyledModalWidths.FULL_WIDTH} heading="Help">
        <DfxHelpContent {...args} />
      </StyledModal>
    </>
  );
};

Default.args = {
  videoSources: [
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
  ],
  title: 'Get started with the DFX Exchange',
  description:
    "We are the crypto exchange you don't need to trust your funds. Your keys, your coins, here is how it works:",
};
