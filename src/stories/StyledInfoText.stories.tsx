import { ComponentMeta, ComponentStory } from '@storybook/react';
import StyledInfoText from './StyledInfoText';

export default {
  title: 'Building Blocks/StyledInfoText',
  component: StyledInfoText,
} as ComponentMeta<typeof StyledInfoText>;

export const DemoIconButton: ComponentStory<typeof StyledInfoText> = (args) => {
  let whiteBG = 'p-10 max-w-xl rounded';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <StyledInfoText {...args}>
        Please transfer the purchase amount using this information via your banking application. The purpose of payment
        is important!
      </StyledInfoText>
    </div>
  );
};
DemoIconButton.args = {
  darkTheme: false,
};
