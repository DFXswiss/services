import { ComponentStory, ComponentMeta } from '@storybook/react';
import StyledBankAccountListItem from './StyledBankAccountListItem';

export default {
  title: 'Forms/StyledBankAccountListItem',
  component: StyledBankAccountListItem,
} as ComponentMeta<typeof StyledBankAccountListItem>;

export const SingleListItem: ComponentStory<typeof StyledBankAccountListItem> = (args) => (
  <div className="bg-white rounded p-8 max-w-lg">
    <StyledBankAccountListItem {...args} />
  </div>
);

SingleListItem.args = {
  bankAccount: { id: 1, iban: 'BE68 5390 0754 7034', sepaInstant: true, label: 'Credit Suisse' },
};

export const ThreeListItems: ComponentStory<typeof StyledBankAccountListItem> = () => (
  <div className="bg-white rounded p-8 max-w-lg">
    <StyledBankAccountListItem
      bankAccount={{ id: 1, iban: 'BE68 5390 0754 7034', sepaInstant: true, label: 'Credit Suisse' }}
    />
    <StyledBankAccountListItem
      bankAccount={{ id: 2, iban: 'DE44 5920 0754 2344', sepaInstant: true, label: 'Commerzbank' }}
    />
    <StyledBankAccountListItem
      bankAccount={{ id: 3, iban: 'CH68 5390 2384 2349', sepaInstant: true, label: 'GLS GemeinschaftsBank Bochum' }}
    />
  </div>
);
