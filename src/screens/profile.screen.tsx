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
  StyledSpacer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function ProfileScreen(): JSX.Element {
  useSessionGuard();
  const { translate } = useSettingsContext();
  const { countries, reloadUser } = useUserContext();
  const { setKycData } = useKyc();
  const { navigate } = useNavigation();
  const { redirectPath, setRedirectPath } = useAppHandlingContext();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycData>({ mode: 'onTouched' });
  const selectedAccountType = useWatch({ control, name: 'accountType' });
  const rootRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  function onSubmit(data: KycData) {
    setIsSubmitting(true);
    setKycData(data)
      .then(() => reloadUser())
      // wait for the user to reload
      .then(() =>
        setTimeout(() => {
          setRedirectPath(undefined);
          navigate(redirectPath ?? '/');
        }, 10),
      )
      .catch((error: ApiError) => {
        setErrorMessage(error.message ?? 'Unknown error');
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
    <Layout title={translate('screens/profile', 'User details')} rootRef={rootRef}>
      {/* CONTENT */}
      <DfxIcon icon={IconVariant.USER_DATA} color={IconColor.BLUE} />
      <p className="text-base font-bold text-dfxBlue-800">
        {translate('screens/profile', 'Please fill in personal information to continue')}
      </p>
      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
        <StyledVerticalStack marginY={4} gap={2} full>
          <div>
            <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-4 mb-1">
              {translate('screens/profile', 'Account Type')}
            </p>
            <StyledDropdown
              rootRef={rootRef}
              name="accountType"
              label=""
              placeholder={translate('general/actions', 'Select...')}
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
                  autocomplete="firstname"
                  label={translate('screens/profile', 'First name')}
                  placeholder={translate('screens/profile', 'John')}
                  full
                  smallLabel
                />
                <StyledInput
                  name="surname"
                  autocomplete="lastname"
                  label={translate('screens/profile', 'Last name')}
                  placeholder={translate('screens/profile', 'Doe')}
                  full
                  smallLabel
                />
              </StyledHorizontalStack>
              <StyledHorizontalStack gap={2}>
                <StyledInput
                  name="street"
                  autocomplete="street"
                  label={translate('screens/profile', 'Street')}
                  placeholder={translate('screens/profile', 'Street')}
                  full
                  smallLabel
                />
                <StyledInput
                  name="houseNumber"
                  autocomplete="house-number"
                  label={translate('screens/profile', 'House nr.')}
                  placeholder="xx"
                  small
                  smallLabel
                />
              </StyledHorizontalStack>
              <StyledHorizontalStack gap={2}>
                <StyledInput
                  name="zip"
                  autocomplete="zip"
                  type="number"
                  label={translate('screens/profile', 'ZIP code')}
                  placeholder="12345"
                  small
                  smallLabel
                />
                <StyledInput
                  name="location"
                  autocomplete="city"
                  label={translate('screens/profile', 'City')}
                  placeholder="Berlin"
                  full
                  smallLabel
                />
              </StyledHorizontalStack>
              <StyledDropdown
                rootRef={rootRef}
                name="country"
                label={translate('screens/profile', 'Country')}
                placeholder={translate('general/actions', 'Select...')}
                items={countries}
                labelFunc={(item) => item.name}
                smallLabel
              />
              <StyledInput
                name="mail"
                autocomplete="email"
                type="email"
                label={translate('screens/profile', 'Email address')}
                placeholder={translate('screens/profile', 'example@mail.com')}
                smallLabel
              />
              <StyledInput
                name="phone"
                autocomplete="phone"
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
                    autocomplete="organization-name"
                    label={translate('screens/profile', 'Organization name')}
                    placeholder={translate('screens/profile', 'Example inc.')}
                    full
                    smallLabel
                  />
                  <StyledHorizontalStack gap={2}>
                    <StyledInput
                      name="organizationStreet"
                      autocomplete="street"
                      label={translate('screens/profile', 'Street')}
                      placeholder={translate('screens/profile', 'Street')}
                      full
                      smallLabel
                    />
                    <StyledInput
                      name="organizationHouseNumber"
                      autocomplete="houseNumber"
                      label={translate('screens/profile', 'House nr.')}
                      placeholder="xx"
                      small
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledHorizontalStack gap={2}>
                    <StyledInput
                      name="organizationZip"
                      autocomplete="zip"
                      type="number"
                      label={translate('screens/profile', 'ZIP code')}
                      placeholder="12345"
                      small
                      smallLabel
                    />
                    <StyledInput
                      name="organizationLocation"
                      autocomplete="city"
                      label={translate('screens/profile', 'City')}
                      placeholder="Berlin"
                      full
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledDropdown
                    rootRef={rootRef}
                    name="organizationCountry"
                    label={translate('screens/profile', 'Country')}
                    placeholder={translate('general/actions', 'Select...')}
                    items={countries}
                    labelFunc={(item) => item.name}
                    smallLabel
                  />
                </>
              )}
              <StyledSpacer spacing={1} />

              {errorMessage && (
                <>
                  <p className="text-dfxRed-100">
                    {translate(
                      'general/errors',
                      'Something went wrong. Please try again. If the issue persists please reach out to our support.',
                    )}
                  </p>
                  <p className="text-dfxGray-800 text-sm">{errorMessage}</p>
                  <StyledSpacer spacing={1} />
                </>
              )}

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
