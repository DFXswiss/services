import StyledDataBox from './StyledDataBox';
import StyledDataTextRow from './StyledDataTextRow';
import StyledButton, { StyledButtonSizes, StyledButtonWidths } from './StyledButton';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { IconVariant, IconColors, IconSizes } from './DfxIcon';
import StyledIconButton from './StyledIconButton';

export default {
  title: 'Composites/DataBox',
  component: StyledDataBox,
} as ComponentMeta<typeof StyledDataBox>;

export const WithoutRows: ComponentStory<typeof StyledDataBox> = (args) => {
  return <StyledDataBox {...args} />;
};
WithoutRows.args = {
  heading: 'Your Data is Missing',
};

export const WithRows: ComponentStory<typeof StyledDataBox> = (args) => {
  return (
    <StyledDataBox {...args}>
      <StyledDataTextRow label="Metamask">
        Account1: 0x6724...f1436{' '}
        <StyledIconButton
          icon={IconVariant.COPY}
          onClick={() => {
            console.log('copied.');
          }}
          inline
        />
      </StyledDataTextRow>
      <StyledDataTextRow label="Connected to">
        Ethereum Mainnet{' '}
        <StyledIconButton
          icon={IconVariant.INFO_OUTLINE}
          onClick={() => {
            console.log('informed.');
          }}
          inline
        />
      </StyledDataTextRow>
    </StyledDataBox>
  );
};

WithRows.args = {
  heading: 'With Rows and Settings',
  rightIconButton: {
    icon: IconVariant.SETTINGS,
    color: IconColors.RED,
    size: IconSizes.LG,
    onClick: () => {
      console.log('clicked');
    },
  },
};

export const WithIntegratedButton: ComponentStory<typeof StyledDataBox> = (args) => {
  return (
    <StyledDataBox {...args}>
      <StyledDataTextRow label="E-mail address">john.doe@gmail.com</StyledDataTextRow>
      <StyledDataTextRow label="Your Referral Code">
        000-802
        <StyledButton
          caps={false}
          onClick={() => {
            console.log('button clicked');
          }}
          size={StyledButtonSizes.SMALL}
          label="Copy link to share"
          width={StyledButtonWidths.MIN}
        />
      </StyledDataTextRow>
    </StyledDataBox>
  );
};

WithIntegratedButton.args = {
  heading: 'With Buttons',
};

export const LoggedIn: ComponentStory<typeof StyledDataBox> = (args) => {
  return (
    <StyledDataBox {...args}>
      <StyledDataTextRow label="Metamask">Account1: 0x672424234234234f1436</StyledDataTextRow>
      <StyledDataTextRow label="Connected to">Ethereum Mainnet</StyledDataTextRow>
    </StyledDataBox>
  );
};

LoggedIn.args = {
  heading: 'Your wallet',
  boxButtonLabel: 'Log Out',
  boxButtonOnClick() {
    console.log('Logged out.');
  },
};
