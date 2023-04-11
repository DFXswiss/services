import { IconVariant } from '../DfxIcon';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useForm } from 'react-hook-form';
import Form from './Form';
import StyledDropdown from './StyledDropdown';

export default {
  title: 'Forms/StyledDropdown',
  component: StyledDropdown,
} as ComponentMeta<typeof StyledDropdown>;

export const CurrencySelector: ComponentStory<typeof StyledDropdown> = (args) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ test: string }>();

  const onSubmit = handleSubmit((data) => console.log(data));
  return (
    <div className="bg-white p-10 max-w-xs">
      <Form control={control} errors={errors} onSubmit={onSubmit}>
        <StyledDropdown<TestItem>
          {...args}
          name="test"
          items={dummyCurrencies}
          labelFunc={(item) => item.title}
          descriptionFunc={(item) => item.description}
        />
      </Form>
    </div>
  );
};

interface TestItem {
  title: string;
  description: string;
}

export const dummyCurrencies: TestItem[] = [
  { title: 'EUR', description: 'EURO' },
  { title: 'USD', description: 'US Dollar' },
  { title: 'CHF', description: 'Swiss Franc' },
  { title: 'GBP', description: 'British Pound' },
];

CurrencySelector.args = {
  label: 'Your Currency',
  labelIcon: IconVariant.BANK,
  placeholder: 'e.g. EUR',
};
