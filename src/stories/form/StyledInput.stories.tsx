import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useForm } from 'react-hook-form';
import Form from './Form';
import StyledInput from './StyledInput';

export default {
  title: 'Forms/StyledInput',
  component: StyledInput,
} as ComponentMeta<typeof StyledInput>;

export const DefaultInput: ComponentStory<typeof StyledInput> = (args) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ test: string }>();

  const onSubmit = handleSubmit((data) => console.log(data));
  let whiteBG = 'p-10 max-w-xl';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <Form control={control} errors={errors} onSubmit={onSubmit}>
        <StyledInput {...args} name="test" />
      </Form>
    </div>
  );
};
DefaultInput.args = {
  label: 'Contact information',
  placeholder: 'E-Mail Address',
  forceError: false,
  hideLabel: false,
  darkTheme: false,
};

export const BuyAmount: ComponentStory<typeof StyledInput> = (args) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ test: string }>();

  const onSubmit = handleSubmit((data) => console.log(data));
  let whiteBG = 'p-10 max-w-xl';
  args.darkTheme ? (whiteBG += ' bg-none') : (whiteBG += ' bg-white');
  return (
    <div className={whiteBG}>
      <Form control={control} errors={errors} onSubmit={onSubmit}>
        <StyledInput {...args} name="test" />
      </Form>
    </div>
  );
};
BuyAmount.args = {
  label: 'Buy amount',
  placeholder: '0.00',
  prefix: '€',
  forceError: false,
  hideLabel: false,
  darkTheme: false,
};
