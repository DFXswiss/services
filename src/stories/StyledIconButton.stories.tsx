import StyledIconButton from './StyledIconButton';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { IconColors, IconSizes, IconVariant } from './DfxIcon';

export default {
  title: 'Building Blocks/StyledIconButton',
  component: StyledIconButton,
} as ComponentMeta<typeof StyledIconButton>;

export const DemoIconButton: ComponentStory<typeof StyledIconButton> = (args) => {
  return <StyledIconButton {...args} />;
};
DemoIconButton.args = {
  icon: IconVariant.BANK,
  color: IconColors.RED,
  size: IconSizes.MD,
  onClick: () => {
    alert('button clicked.');
  },
};
