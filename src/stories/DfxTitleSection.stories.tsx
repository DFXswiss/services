import DfxTitleSection from './DfxTitleSection';
import { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  title: 'Composites/DfxTitleSection',
  component: DfxTitleSection,
} as ComponentMeta<typeof DfxTitleSection>;

export const DefaultTitleSection: ComponentStory<typeof DfxTitleSection> = (args) => {
  return <DfxTitleSection {...args} />;
};
DefaultTitleSection.args = {
  heading: 'DFX Multichain',
  subheading: 'BUY • SELL • CONVERT • STAKE',
};
