import { ComponentMeta, ComponentStory } from '@storybook/react';
import StyledLoadingSpinner, { SpinnerVariant } from './StyledLoadingSpinner';

export default {
  title: 'Building Blocks/StyledLoadingSpinner',
  component: StyledLoadingSpinner,
} as ComponentMeta<typeof StyledLoadingSpinner>;

export const DemoIconButton: ComponentStory<typeof StyledLoadingSpinner> = (args) => {
  let whiteBG = 'p-10 max-w-sm';
  args.variant !== SpinnerVariant.LIGHT_MODE ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <StyledLoadingSpinner {...args} />
    </div>
  );
};
DemoIconButton.args = {
  variant: SpinnerVariant.DARK_MODE,
};
