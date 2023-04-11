import StyledDataTableRow from './StyledDataTableRow';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { IconVariant } from './DfxIcon';
import StyledIconButton from './StyledIconButton';

export default {
  title: 'Building Blocks/StyledDataTableRow',
  component: StyledDataTableRow,
} as ComponentMeta<typeof StyledDataTableRow>;

export const DataRowTextOnly: ComponentStory<typeof StyledDataTableRow> = (args) => {
  return <StyledDataTableRow {...args}>Ethereum Mainnet</StyledDataTableRow>;
};
DataRowTextOnly.args = {
  label: 'Connected to',
};

export const WithInfoText: ComponentStory<typeof StyledDataTableRow> = (args) => {
  return (
    <StyledDataTableRow {...args}>
      OC11-A025-BCF7{' '}
      <StyledIconButton
        icon={IconVariant.COPY}
        onClick={() => {
          console.log('copied.');
        }}
      />{' '}
    </StyledDataTableRow>
  );
};
WithInfoText.args = {
  label: 'Purpose of Payment',
  infoText:
    'The purpose of payment remains identical for the selected asset and can be used for recurring payments and standing orders.',
};
