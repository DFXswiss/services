import { AccountType, ApiError, KycData, Utils, Validations, useKyc, useUserContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconColor,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledHorizontalStack,
  StyledInput,
  StyledModal,
  StyledModalType,
  StyledModalWidth,
  StyledSpacer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { usePath } from '../hooks/path.hook';

export function ProfileScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { countries, reloadUser } = useUserContext();
  const { setKycData } = useKyc();
  const { navigate } = usePath();
  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycData>({ mode: 'onTouched' });
  const selectedAccountType = useWatch({ control, name: 'accountType' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [showsErrorAlert, setShowsErrorAlert] = useState(false);

  function onSubmit(data: KycData) {
    setIsSubmitting(true);
    setKycData(data)
      .then(() => reloadUser())
      .then(() => navigate({ pathname: '/sell' }, { replace: true }))
      .catch((error: ApiError) => {
        setErrorMessage(error.message);
        setShowsErrorAlert(true);
      })
      .finally(() => setIsSubmitting(false));
  }

  const rules = Utils.createRules({
    accountType: Validations.Required,

    firstname: Validations.Required,
    surname: Validations.Required,
    street: Validations.Required,
    houseNumber: Validations.Required,
    zip: Validations.Required,
    location: Validations.Required,
    country: Validations.Required,

    mail: [Validations.Required, Validations.Mail],
    phone: [Validations.Required, Validations.Phone],

    organizationName: Validations.Required,
    organizationStreet: Validations.Required,
    organizationHouseNumber: Validations.Required,
    organizationLocation: Validations.Required,
    organizationZip: Validations.Required,
    organizationCountry: Validations.Required,
  });

  return (
    <Layout title={translate('screens/profile', 'User details')}>
      {/* MODAL */}
      <StyledModal
        isVisible={showsErrorAlert}
        onClose={setShowsErrorAlert}
        type={StyledModalType.ALERT}
        width={StyledModalWidth.NONE}
      >
        <StyledVerticalStack gap={4}>
          <h1>{translate('general/errors', 'Something went wrong')}</h1>
          <p>
            {translate(
              'general/errors',
              'Please try again later. If the issue persists please reach out to our support.',
            )}
          </p>
          {errorMessage && <p className="text-dfxGray-800 text-sm">{errorMessage}</p>}
          <div className="mx-auto">
            <StyledButton
              width={StyledButtonWidth.SM}
              onClick={() => setShowsErrorAlert(false)}
              label={translate('general/actions', 'Ok')}
            />
          </div>
        </StyledVerticalStack>
      </StyledModal>
      {/* CONTENT */}
      <DfxIcon icon={IconVariant.USER_DATA} color={IconColor.BLUE} />
      <p className="text-base font-bold text-dfxBlue-800">
        {translate('screens/profile', 'Please fill in personal information to continue')}
      </p>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack marginY={4} gap={2} full>
          <div>
            <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-4 -mb-1">
              {translate('screens/profile', 'Account Type')}
            </p>
            <StyledDropdown
              name="accountType"
              label=""
              placeholder={translate('general/actions', 'Please select...')}
              items={Object.values(AccountType)}
              labelFunc={(item) => translate('screens/profile', item)}
            />
          </div>
          {selectedAccountType && (
            <>
              <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3 mt-4">
                {translate('screens/profile', 'Personal Information')}
              </p>
              <StyledHorizontalStack gap={2}>
                <StyledInput
                  name="firstname"
                  label={translate('screens/profile', 'First name')}
                  placeholder={translate('screens/profile', 'John')}
                  full
                  smallLabel
                />
                <StyledInput
                  name="surname"
                  label={translate('screens/profile', 'Last name')}
                  placeholder={translate('screens/profile', 'Doe')}
                  full
                  smallLabel
                />
              </StyledHorizontalStack>
              <StyledHorizontalStack gap={2}>
                <StyledInput
                  name="street"
                  label={translate('screens/profile', 'Street')}
                  placeholder={translate('screens/profile', 'Street')}
                  full
                  smallLabel
                />
                <StyledInput
                  name="houseNumber"
                  label={translate('screens/profile', 'House nr.')}
                  placeholder="xx"
                  small
                  smallLabel
                />
              </StyledHorizontalStack>
              <StyledHorizontalStack gap={2}>
                <StyledInput
                  name="zip"
                  type="number"
                  label={translate('screens/profile', 'ZIP code')}
                  placeholder="12345"
                  small
                  smallLabel
                />
                <StyledInput
                  name="location"
                  label={translate('screens/profile', 'City')}
                  placeholder="Berlin"
                  full
                  smallLabel
                />
              </StyledHorizontalStack>
              <StyledDropdown
                name="country"
                label={translate('screens/profile', 'Country')}
                placeholder={translate('general/actions', 'Please select...')}
                items={countries}
                labelFunc={(item) => item.name}
                smallLabel
              />
              <StyledInput
                name="mail"
                type="email"
                label={translate('screens/profile', 'Email address')}
                placeholder={translate('screens/profile', 'example@mail.com')}
                smallLabel
              />
              <StyledInput
                name="phone"
                type="tel"
                label={translate('screens/profile', 'Phone number')}
                placeholder="+49 12345678"
                smallLabel
              />
              {selectedAccountType !== AccountType.PERSONAL && (
                <>
                  <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3 mt-4">
                    {translate('screens/profile', 'Organization Information')}
                  </p>
                  <StyledInput
                    name="organizationName"
                    label={translate('screens/profile', 'Organization name')}
                    placeholder={translate('screens/profile', 'Example inc.')}
                    full
                    smallLabel
                  />
                  <StyledHorizontalStack gap={2}>
                    <StyledInput
                      name="organizationStreet"
                      label={translate('screens/profile', 'Street')}
                      placeholder={translate('screens/profile', 'Street')}
                      full
                      smallLabel
                    />
                    <StyledInput
                      name="organizationHouseNumber"
                      label={translate('screens/profile', 'House nr.')}
                      placeholder="xx"
                      small
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledHorizontalStack gap={2}>
                    <StyledInput
                      name="organizationZip"
                      type="number"
                      label={translate('screens/profile', 'ZIP code')}
                      placeholder="12345"
                      small
                      smallLabel
                    />
                    <StyledInput
                      name="organizationLocation"
                      label={translate('screens/profile', 'City')}
                      placeholder="Berlin"
                      full
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledDropdown
                    name="organizationCountry"
                    label={translate('screens/profile', 'Country')}
                    placeholder={translate('general/actions', 'Please select...')}
                    items={countries}
                    labelFunc={(item) => item.name}
                    smallLabel
                  />
                </>
              )}
              <StyledSpacer spacing={1} />
              <StyledButton
                label={translate('general/actions', 'Continue')}
                onClick={handleSubmit(onSubmit)}
                width={StyledButtonWidth.FULL}
                disabled={!isValid}
                isLoading={isSubmitting}
                caps
              />
            </>
          )}
        </StyledVerticalStack>
      </Form>
      <StyledSpacer spacing={8} />
    </Layout>
  );
}
