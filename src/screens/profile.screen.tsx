import { useForm } from 'react-hook-form';
import { Layout } from '../components/layout';
import { useLanguageContext } from '../contexts/language.context';
import DfxIcon, { IconColors, IconVariant } from '../stories/DfxIcon';
import StyledInput from '../stories/form/StyledInput';
import StyledHorizontalStack from '../stories/layout-helpers/StyledHorizontalStack';
import Form from '../stories/form/Form';
import { Utils } from '../utils';
import Validations from '../validations';
import StyledVerticalStack from '../stories/layout-helpers/StyledVerticalStack';
import StyledDropdown from '../stories/form/StyledDropdown';
import { useUserContext } from '../api/contexts/user.context';
import StyledButton from '../stories/StyledButton';
import { StyledButtonWidths } from '../stories/StyledButton';
import StyledSpacer from '../stories/layout-helpers/StyledSpacer';
import { useState } from 'react';
import { KycData } from '../api/definitions/kyc';
import { useKyc } from '../api/hooks/kyc.hook';
import { useNavigate } from 'react-router-dom';

export function ProfileScreen(): JSX.Element {
  const { translate } = useLanguageContext();
  const { countries, reloadUser } = useUserContext();
  const { setKycData } = useKyc();
  const navigate = useNavigate();
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycData>({ mode: 'onTouched' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function onSubmit(data: KycData) {
    setIsSubmitting(true);
    setKycData(data)
      .then(() => reloadUser())
      .then(() => navigate({ pathname: '/sell' }, { replace: true }))
      .finally(() => setIsSubmitting(false));
  }

  const rules = Utils.createRules({
    firstname: Validations.Required,
    surname: Validations.Required,
    street: Validations.Required,
    houseNumber: Validations.Required,
    zip: Validations.Required,
    location: Validations.Required,
    country: Validations.Required,

    mail: [Validations.Required, Validations.Mail],
    phone: [Validations.Required, Validations.Phone],
  });

  return (
    <Layout backTitle={translate('screens/profile', 'User details')}>
      <DfxIcon icon={IconVariant.USER_DATA} color={IconColors.BLUE} />
      <p className="text-base font-bold text-dfxBlue-800">
        {translate('screens/profile', 'Please fill in personal information to continue.')}
      </p>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack marginY={4} gap={2}>
          <StyledHorizontalStack gap={2}>
            <StyledInput name="firstname" label={translate('screens/profile', 'First name')} placeholder="John" />
            <StyledInput name="surname" label={translate('screens/profile', 'Last name')} placeholder="Doe" />
          </StyledHorizontalStack>
          <StyledHorizontalStack gap={2}>
            <StyledInput
              name="street"
              label={translate('screens/profile', 'Street')}
              placeholder={translate('screens/profile', 'Street')}
              full
            />
            <StyledInput name="houseNumber" label={translate('screens/profile', 'House nr.')} placeholder="xx" small />
          </StyledHorizontalStack>
          <StyledHorizontalStack gap={2}>
            <StyledInput
              name="zip"
              type="number"
              label={translate('screens/profile', 'ZIP code')}
              placeholder="12345"
              small
            />
            <StyledInput name="location" label={translate('screens/profile', 'City')} placeholder="Berlin" full />
          </StyledHorizontalStack>
          <StyledDropdown
            name="country"
            label={translate('screens/profile', 'Country')}
            placeholder={translate('general/actions', 'Please select...')}
            items={countries}
            labelFunc={(item) => item.name}
          />
          <StyledInput
            name="mail"
            type="email"
            label={translate('screens/profile', 'Email address')}
            placeholder="example@mail.com"
          />
          <StyledInput
            name="phone"
            type="tel"
            label={translate('screens/profile', 'Phone number')}
            placeholder="+49 12345678"
          />
        </StyledVerticalStack>
        <StyledSpacer spacing={1} />
        <StyledButton
          label={translate('general/actions', 'continue')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidths.FULL}
          disabled={!isValid}
          isLoading={isSubmitting}
          caps
        />
      </Form>
      <StyledSpacer spacing={8} />
    </Layout>
  );
}
