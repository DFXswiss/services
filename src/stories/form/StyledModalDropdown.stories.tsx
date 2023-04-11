import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useForm } from 'react-hook-form';
import StyledButton from '../StyledButton';
import Form from './Form';
import StyledInput from './StyledInput';
import StyledModalDropdown from './StyledModalDropdown';

export default {
  title: 'Forms/StyledModalDropdown',
  component: StyledModalDropdown,
} as ComponentMeta<typeof StyledModalDropdown>;

interface TestElement {
  test: string;
}

function AddTest({ onSubmit }: { onSubmit: (test: TestElement) => void }): JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TestElement>();

  return (
    <Form control={control} errors={errors} onSubmit={handleSubmit(onSubmit)}>
      <StyledInput label="Test" placeholder="put something in" name="test" />
      <StyledButton label="complete" onClick={handleSubmit(onSubmit)} caps />
    </Form>
  );
}

export const BuyAmount: ComponentStory<typeof StyledModalDropdown> = (args) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TestElement>();

  const onSubmit = () => {
    handleSubmit((data) => console.log(data));
  };
  return (
    <div className="bg-white p-10">
      <Form control={control} errors={errors} onSubmit={onSubmit}>
        <StyledModalDropdown<TestElement>
          {...args}
          name="test"
          labelFunc={(item) => item.test}
          descriptionFunc={() => 'Some optional description'}
          modal={{
            heading: 'Some test header',
            items: [{ test: 'abc' }, { test: 'def' }],
            itemContent: (item) => <p>{item.test}</p>,
            form: (onFormSubmit: (item: TestElement) => void) => <AddTest onSubmit={onFormSubmit} />,
          }}
        />
      </Form>
    </div>
  );
};
BuyAmount.args = {
  label: 'Your bank account',
  placeholder: 'Add or select your IBAN',
};
