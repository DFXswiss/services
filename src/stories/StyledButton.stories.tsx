import StyledButton, { StyledButtonSizes, StyledButtonColors, StyledButtonWidths } from './StyledButton';
import { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  title: 'Building Blocks/StyledButton',
  component: StyledButton,
} as ComponentMeta<typeof StyledButton>;

export const BigButton: ComponentStory<typeof StyledButton> = (args) => {
  return (
    <div className="flex space-x-2 justify-center">
      <StyledButton {...args} />
    </div>
  );
};
BigButton.args = {
  label: 'connect to Metamask',
  size: StyledButtonSizes.BIG,
  width: StyledButtonWidths.MD,
  color: StyledButtonColors.RED,
  caps: true,
};

export const SmallButton: ComponentStory<typeof StyledButton> = (args) => {
  return (
    <div className="flex space-x-2 justify-center">
      <StyledButton {...args} />
    </div>
  );
};

SmallButton.args = {
  label: 'Copy link to share',
  size: StyledButtonSizes.SMALL,
  width: StyledButtonWidths.MD,
  color: StyledButtonColors.WHITE,
  caps: false,
};

export const DefaultButton: ComponentStory<typeof StyledButton> = (args) => {
  return (
    <div className="flex space-x-2 justify-center">
      <StyledButton {...args} />
    </div>
  );
};
DefaultButton.args = {
  label: 'Default-Style: no Args',
};
