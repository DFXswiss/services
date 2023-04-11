import { ComponentStory, ComponentMeta } from '@storybook/react';
import { useState } from 'react';
import StyledButton, { StyledButtonColors, StyledButtonWidths } from './StyledButton';

import StyledModal, { StyledModalColors, StyledModalTypes } from './StyledModal';

export default {
  title: 'Building Blocks/StyledModal',
  component: StyledModal,
} as ComponentMeta<typeof StyledModal>;

export const RegularModalWithHeading: ComponentStory<typeof StyledModal> = (args) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      <StyledButton label="Open Modal" onClick={() => setShowModal(true)}></StyledButton>
      <StyledModal {...args} onClose={setShowModal} isVisible={showModal}>
        <h2>Dieses Modal kann man mit X schließen</h2>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque quisquam illum ea magni consequatur voluptas,
          necessitatibus temporibus, delectus alias tempora exercitationem accusantium culpa dolorem adipisci. Fugiat
          hic laborum tempore obcaecati.
        </p>
        <p>
          <br></br>
        </p>
        <StyledButton
          width={StyledButtonWidths.FULL}
          color={StyledButtonColors.RED}
          label="Oder über den Button"
          caps={false}
          onClick={() => {
            setShowModal(false);
          }}
        />
      </StyledModal>
    </>
  );
};

RegularModalWithHeading.args = {
  heading: 'Eine Überschrift',
  color: StyledModalColors.DFX_GRADIENT,
  closeWithX: true,
};

export const WhiteModalWithHeading: ComponentStory<typeof StyledModal> = (args) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      <StyledButton label="Open White Modal" onClick={() => setShowModal(true)}></StyledButton>
      <StyledModal {...args} onClose={setShowModal} isVisible={showModal}>
        <h2>Hier wurde das X deaktiviert.</h2>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque quisquam illum ea magni consequatur voluptas,
          necessitatibus temporibus, delectus alias tempora exercitationem accusantium culpa dolorem adipisci. Fugiat
          hic laborum tempore obcaecati.
        </p>
        <p>
          <br></br>
        </p>
        <StyledButton
          width={StyledButtonWidths.FULL}
          color={StyledButtonColors.RED}
          label="Schließen nur über den Button"
          caps={false}
          onClick={() => {
            setShowModal(false);
          }}
        />
      </StyledModal>
    </>
  );
};

WhiteModalWithHeading.args = {
  heading: 'Eine Überschrift',
  color: StyledModalColors.WHITE,
  closeWithX: false,
};

export const AlertModal: ComponentStory<typeof StyledModal> = (args) => {
  const [showModal, setShowModal] = useState(true);
  return (
    <>
      <StyledButton label="Open Alert Modal" caps={false} onClick={() => setShowModal(true)}></StyledButton>
      <StyledModal {...args} onClose={setShowModal} isVisible={showModal}>
        <h1>Terms and Conditions.</h1>
        <p>
          Please read our terms and conditions and click on ”Next”to confirm and to continue to the DFX Multichain
          Service.
        </p>
        <p>
          <br></br>
        </p>
        <StyledButton
          width={StyledButtonWidths.MD}
          color={StyledButtonColors.RED}
          label="Schließen nur über den Button"
          caps={false}
          onClick={() => {
            setShowModal(false);
          }}
        />
      </StyledModal>
    </>
  );
};

AlertModal.args = {
  type: StyledModalTypes.ALERT,
};
