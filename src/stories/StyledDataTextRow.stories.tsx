import StyledDataTextRow from './StyledDataTextRow';
import { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  title: 'Building Blocks/StyledDataTextRow',
  component: StyledDataTextRow,
} as ComponentMeta<typeof StyledDataTextRow>;

export const DataRowTextOnly: ComponentStory<typeof StyledDataTextRow> = (args) => {
  return <StyledDataTextRow {...args}>Ethereum Mainnet</StyledDataTextRow>;
};
DataRowTextOnly.args = {
  label: 'Connected to',
};
