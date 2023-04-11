import DfxIcon, { IconColors, IconSizes, IconVariant } from './DfxIcon';
import { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  title: 'Building Blocks/DfxIcons',
  component: DfxIcon,
} as ComponentMeta<typeof DfxIcon>;

export const SingleIcon: ComponentStory<typeof DfxIcon> = (args) => {
  return <DfxIcon {...args} />;
};

SingleIcon.args = {
  icon: IconVariant.COPY,
  color: IconColors.RED,
};

export const ProcessDoneIcon: ComponentStory<typeof DfxIcon> = (args) => {
  return <DfxIcon {...args} />;
};

ProcessDoneIcon.args = {
  icon: IconVariant.PROCESS_DONE,
  size: IconSizes.XL,
};

export const AllIcons: ComponentStory<typeof DfxIcon> = (args) => {
  return (
    <div className="grid gap-6 grid-cols-6">
      <DfxIcon {...args} icon={IconVariant.ARROW_LEFT} />
      <DfxIcon {...args} icon={IconVariant.ARROW_RIGHT} />
      <DfxIcon {...args} icon={IconVariant.BACK} />
      <DfxIcon {...args} icon={IconVariant.FORWARD} />
      <DfxIcon {...args} icon={IconVariant.CHEV_LEFT} />
      <DfxIcon {...args} icon={IconVariant.CHEV_RIGHT} />
      <DfxIcon {...args} icon={IconVariant.CLOSE} />
      <DfxIcon {...args} icon={IconVariant.CANCEL} />
      <DfxIcon {...args} icon={IconVariant.COPY} />
      <DfxIcon {...args} icon={IconVariant.EXPAND_LESS} />
      <DfxIcon {...args} icon={IconVariant.EXPAND_MORE} />
      <DfxIcon {...args} icon={IconVariant.INFO} />
      <DfxIcon {...args} icon={IconVariant.INFO_OUTLINE} />
      <DfxIcon {...args} icon={IconVariant.SETTINGS} />
      <DfxIcon {...args} icon={IconVariant.UNFOLD_LESS} />
      <DfxIcon {...args} icon={IconVariant.UNFOLD_MORE} />
      <DfxIcon {...args} icon={IconVariant.WALLET} />
      <DfxIcon {...args} icon={IconVariant.BANK} />
      <DfxIcon {...args} icon={IconVariant.SEPA_INSTANT} />
      <DfxIcon {...args} icon={IconVariant.PROCESS_DONE} />
      <DfxIcon {...args} icon={IconVariant.EDIT} />
      <DfxIcon {...args} icon={IconVariant.HELP} />
    </div>
  );
};

AllIcons.args = {};
