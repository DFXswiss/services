import { ComponentStory, ComponentMeta } from '@storybook/react';

import DfxPageLayout from './DfxPageLayout';

export default {
  title: 'Layout/PageLayout',
  component: DfxPageLayout,
} as ComponentMeta<typeof DfxPageLayout>;

export const Template: ComponentStory<typeof DfxPageLayout> = () => <DfxPageLayout />;

Template.args = {};
