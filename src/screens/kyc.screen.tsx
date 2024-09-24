import {
  AccountType,
  ApiError,
  Country,
  KycContactData,
  KycFinancialOption,
  KycFinancialQuestion,
  KycFinancialResponse,
  KycInfo,
  KycLevel,
  KycPersonalData,
  KycSession,
  KycStep,
  KycStepName,
  KycStepSession,
  KycStepStatus,
  KycStepType,
  Language,
  QuestionType,
  SupportIssueType,
  UrlType,
  Utils,
  Validations,
  isStepDone,
  useKyc,
  useSessionContext,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCheckboxRow,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledDropdown,
  StyledDropdownMultiChoice,
  StyledFileUpload,
  StyledHorizontalStack,
  StyledIconButton,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledSearchDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import {
  KycFileData,
  KycLegalEntityData,
  KycNationalityData,
  KycSignatoryPowerData,
  LegalEntity,
  SignatoryPower,
} from '@dfx.swiss/react/dist/definitions/kyc';
import SumsubWebSdk from '@sumsub/websdk-react';
import { RefObject, useEffect, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useAppHandlingContext } from 'src/contexts/app-handling.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useGeoLocation } from '../hooks/geo-location.hook';
import { useUserGuard } from '../hooks/guard.hook';
import { useKycHelper } from '../hooks/kyc-helper.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { delay, toBase64 } from '../util/utils';
import { IframeMessageType } from './kyc-redirect.screen';

enum Mode {
  KYC = 'KYC',
  CONTACT = 'Contact',
  PROFILE = 'Profile',
}

const RequiredKycLevel = {
  [Mode.CONTACT]: KycLevel.Link,
  [Mode.PROFILE]: KycLevel.Sell,
};

export default function KycScreen(): JSX.Element {
  const { clearParams } = useNavigation();
  const { translate, changeLanguage, processingKycData } = useSettingsContext();
  const { user, reloadUser } = useUserContext();
  const { getKycInfo, continueKyc, startStep, addTransferClient } = useKyc();
  const { levelToString, limitToString, nameToString } = useKycHelper();
  const { pathname, search } = useLocation();
  const { navigate, goBack } = useNavigation();
  const { logout } = useSessionContext();
  const { isInitialized, params, setParams } = useAppHandlingContext();
  const { lang } = useAppParams();

  const [info, setInfo] = useState<KycInfo | KycSession>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoStarting, setIsAutoStarting] = useState(true);
  const [consentClient, setConsentClient] = useState<string>();
  const [stepInProgress, setStepInProgress] = useState<KycStepSession>();
  const [error, setError] = useState<string>();
  const [showLinkHint, setShowLinkHint] = useState(false);

  const mode = pathname.includes('/profile') ? Mode.PROFILE : pathname.includes('/contact') ? Mode.CONTACT : Mode.KYC;
  const rootRef = useRef<HTMLDivElement>(null);
  const urlParams = new URLSearchParams(search);
  const kycStarted = info?.kycSteps.some((s) => s.status !== KycStepStatus.NOT_STARTED);
  const allStepsCompleted = info?.kycSteps.every((s) => isStepDone(s));
  const canContinue = !allStepsCompleted || (info && info.kycLevel >= KycLevel.Completed);

  // params
  const [step, stepSequence] = urlParams.get('step')?.split(':') ?? [];
  const [stepName, stepType] = step?.split('/') ?? [];
  const paramKycCode = urlParams.get('code');
  const kycCode = paramKycCode ?? user?.kyc.hash;
  const redirectUri = urlParams.get('kyc-redirect');
  const client = urlParams.get('client') ?? undefined;

  useUserGuard('/login', !kycCode);

  useEffect(() => {
    if (!lang && info) changeLanguage(info.language);
  }, [info, lang]);

  useEffect(() => {
    if (!isInitialized) return;
    if (params.autoStart !== 'true') {
      setIsAutoStarting(false);
    } else if (!processingKycData && kycCode) {
      onLoad(true).finally(() => {
        setIsAutoStarting(false);
        setParams({ autoStart: undefined });
      });
    }
  }, [isInitialized, kycCode, processingKycData]);

  useEffect(() => {
    if (info) {
      const missingClient = client && !info.kycClients.includes(client) ? client : undefined;

      if (missingClient && (allStepsCompleted || 'currentStep' in info)) {
        setStepInProgress(undefined);
        setConsentClient(missingClient);
      } else if (allStepsCompleted && redirectUri) {
        setIsLoading(true);
        window.open(redirectUri, '_self');
      }
    }
  }, [redirectUri, info, client]);

  useEffect(() => {
    if (!kycCode) return;

    const request = stepName
      ? callKyc(() =>
          startStep(
            kycCode,
            stepName as KycStepName,
            stepType as KycStepType,
            stepSequence ? +stepSequence : undefined,
          ),
        )
          .then(handleReload)
          .then(() => clearParams(['step']))
      : callKyc(() => getKycInfo(kycCode)).then(handleInitial);

    request
      .then(() => setError(undefined))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [kycCode, stepName, stepType]);

  async function onLoad(next: boolean): Promise<void> {
    if (!kycCode) return;

    setIsSubmitting(true);
    setError(undefined);
    setShowLinkHint(false);
    setConsentClient(undefined);
    return (next ? callKyc(() => continueKyc(kycCode)) : callKyc(() => getKycInfo(kycCode)))
      .then(handleReload)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsSubmitting(false));
  }

  async function handleInitial(info: KycInfo): Promise<void> {
    if (mode === Mode.KYC) {
      setInfo(info);
    } else {
      if (info.kycLevel >= RequiredKycLevel[mode] || !kycCode) {
        goBack();
      } else {
        return callKyc(() => continueKyc(kycCode)).then(handleReload);
      }
    }
  }

  async function handleReload(info: KycSession): Promise<void> {
    if ((mode === Mode.CONTACT || mode === Mode.PROFILE) && info.kycLevel >= RequiredKycLevel[mode]) {
      return reloadUser()
        .then(() => delay(0.01))
        .then(() => goBack());
    } else {
      setInfo(info);

      if (info.currentStep?.name === KycStepName.CONTACT_DATA && info.currentStep?.status === KycStepStatus.FAILED) {
        onLink();
      } else {
        setStepInProgress(info.currentStep);
      }
    }
  }

  async function callKyc<T>(call: () => Promise<T>): Promise<T> {
    return call().catch((e: ApiError) => {
      if (e.statusCode === 401 && 'switchToCode' in e) {
        setIsLoading(true);
        navigate({ search: `?code=${e.switchToCode}` });
        logout();
      } else if (e.statusCode === 403 && e.message?.includes('2FA')) {
        navigate('/2fa', { setRedirect: true });
      } else if (e.statusCode === 409 && e.message?.includes('exists')) {
        onLink();
      }

      throw e;
    });
  }

  function onLink() {
    setStepInProgress(undefined);
    setShowLinkHint(true);
  }

  function retryLink() {
    setIsLoading(true);
    onLoad(false).finally(() => setIsLoading(false));
  }

  function onContinue() {
    return allStepsCompleted ? navigate('/support/issue?issue-type=LimitRequest') : onLoad(true);
  }

  function onConsent(client: string) {
    if (!kycCode) return;

    setIsSubmitting(true);

    addTransferClient(kycCode, client)
      .then(() => onLoad(true))
      .catch((error: ApiError) => {
        setError(error.message ?? 'Unknown error');
        setIsSubmitting(false);
      });
  }

  function stepIcon(step: KycStep): { icon: IconVariant | undefined; label: string; size: IconSize } {
    switch (step.status) {
      case KycStepStatus.NOT_STARTED:
        return { icon: IconVariant.CHECKBOX_EMPTY, label: translate('screens/kyc', 'Not started'), size: IconSize.MD };

      case KycStepStatus.IN_PROGRESS:
        return { icon: IconVariant.EDIT, label: translate('screens/kyc', 'In progress'), size: IconSize.MD };

      case KycStepStatus.IN_REVIEW:
        return { icon: IconVariant.LOADING, label: translate('screens/kyc', 'In review'), size: IconSize.XS };

      case KycStepStatus.COMPLETED:
        return { icon: IconVariant.CHECKBOX_CHECKED, label: translate('screens/kyc', 'Completed'), size: IconSize.MD };

      case KycStepStatus.FAILED:
        return { icon: IconVariant.CLOSE, label: translate('screens/kyc', 'Failed'), size: IconSize.MD };

      case KycStepStatus.OUTDATED:
        return { icon: IconVariant.REPEAT, label: translate('screens/kyc', 'Outdated'), size: IconSize.MD };
    }
  }

  return (
    <Layout
      title={stepInProgress ? nameToString(stepInProgress.name) : translate('screens/kyc', 'DFX KYC')}
      rootRef={rootRef}
      onBack={
        stepInProgress
          ? () => setStepInProgress(undefined)
          : showLinkHint || consentClient
          ? () => onLoad(false)
          : undefined
      }
      noPadding={isMobile && stepInProgress?.session?.type === UrlType.BROWSER}
    >
      {isLoading || isAutoStarting ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : showLinkHint ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">
            {translate('screens/kyc', 'It looks like you already have an account with DFX.')}{' '}
            {translate(
              'screens/kyc',
              'We have just sent you an email. To continue with your existing account, please confirm your email address by clicking on the link sent.',
            )}
          </p>
          <StyledButton
            width={StyledButtonWidth.MIN}
            label={translate('general/actions', 'OK')}
            onClick={retryLink}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      ) : consentClient ? (
        <StyledVerticalStack gap={6} full>
          <p className="text-dfxGray-700">
            {translate('screens/kyc', 'I hereby authorize DFX to transfer my KYC data to {{client}}.', {
              client: consentClient,
            })}
          </p>
          <StyledButton
            width={StyledButtonWidth.MIN}
            label={translate('general/actions', 'Next')}
            onClick={() => onConsent(consentClient)}
            isLoading={isSubmitting}
          />
          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}
        </StyledVerticalStack>
      ) : info && stepInProgress && kycCode && !error ? (
        [KycStepStatus.NOT_STARTED, KycStepStatus.IN_PROGRESS].includes(stepInProgress.status) ? (
          <KycEdit
            rootRef={rootRef}
            mode={mode}
            code={kycCode}
            isLoading={isSubmitting}
            step={stepInProgress}
            lang={info.language}
            onDone={() => onLoad(true)}
            onBack={() => onLoad(false)}
            onError={setError}
            showLinkHint={onLink}
          />
        ) : (
          <StyledVerticalStack gap={6} full center>
            <p className="text-dfxGray-700">{translate('screens/kyc', 'This step has already been finished.')}</p>

            <StyledButton
              width={StyledButtonWidth.MIN}
              label={translate('general/actions', 'Continue')}
              isLoading={isSubmitting}
              onClick={() => onLoad(false)}
            />
          </StyledVerticalStack>
        )
      ) : (
        <StyledVerticalStack gap={6} full center>
          {info && (
            <>
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                <StyledDataTableExpandableRow
                  label={translate('screens/kyc', 'KYC level')}
                  expansionItems={
                    info.kycSteps.length
                      ? info.kycSteps.map((step) => {
                          const icon = stepIcon(step);
                          return {
                            label: nameToString(step.name),
                            text: icon?.label ?? '',
                            icon: icon?.icon,
                          };
                        })
                      : []
                  }
                >
                  <p>{levelToString(info.kycLevel)}</p>
                </StyledDataTableExpandableRow>

                <StyledDataTableRow label={translate('screens/kyc', 'Trading limit')}>
                  <div className="flex flex-row gap-1 items-center">
                    <p>{limitToString(info.tradingLimit)}</p>
                    {canContinue && (
                      <StyledIconButton icon={IconVariant.ARROW_UP} onClick={onContinue} isLoading={isSubmitting} />
                    )}
                  </div>
                </StyledDataTableRow>

                <StyledDataTableRow label={translate('screens/kyc', 'Two-factor authentication')}>
                  <p>{translate('general/actions', info.twoFactorEnabled ? 'Yes' : 'No')}</p>
                </StyledDataTableRow>
              </StyledDataTable>

              {!allStepsCompleted && (
                <StyledButton
                  width={StyledButtonWidth.MIN}
                  label={translate('general/actions', kycStarted ? 'Continue' : 'Start')}
                  isLoading={isSubmitting}
                  onClick={() => onLoad(true)}
                />
              )}
            </>
          )}
          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

interface EditProps {
  rootRef: RefObject<HTMLDivElement>;
  mode: Mode;
  code: string;
  isLoading: boolean;
  step: KycStepSession;
  lang: Language;
  onDone: () => void;
  onBack: () => void;
  onError: (error: string) => void;
  showLinkHint: () => void;
}

function KycEdit(props: EditProps): JSX.Element {
  switch (props.step.name) {
    case KycStepName.CONTACT_DATA:
      return <ContactData {...props} />;

    case KycStepName.PERSONAL_DATA:
      return <PersonalData {...props} />;

    case KycStepName.LEGAL_ENTITY:
      return <LegalEntityData {...props} />;

    case KycStepName.STOCK_REGISTER:
      return <FileUpload {...props} />;

    case KycStepName.NATIONALITY_DATA:
      return <NationalityData {...props} />;

    case KycStepName.COMMERCIAL_REGISTER:
      return <FileUpload {...props} />;

    case KycStepName.SIGNATORY_POWER:
      return <SignatoryPowerData {...props} />;

    case KycStepName.AUTHORITY:
      return <FileUpload {...props} />;

    case KycStepName.IDENT:
      return <Ident {...props} />;

    case KycStepName.FINANCIAL_DATA:
      return <FinancialData {...props} />;

    case KycStepName.DOCUMENT_UPLOAD:
      return <DocumentUpload {...props} />;

    case KycStepName.DFX_APPROVAL:
      return <></>;
  }
}

function ContactData({ code, mode, isLoading, step, onDone, showLinkHint }: EditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { setContactData } = useKyc();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycContactData>({ mode: 'onTouched' });

  function onSubmit(data: KycContactData) {
    if (!step.session) return;

    setIsUpdating(true);
    setError(undefined);
    setContactData(code, step.session.url, data)
      .then((r) => (isStepDone(r) ? onDone() : showLinkHint()))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    mail: [Validations.Required, Validations.Mail],
  });

  return (
    <StyledVerticalStack gap={6} full>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack gap={6} full center>
          {mode !== Mode.KYC && (
            <>
              <DfxIcon icon={IconVariant.USER_DATA} color={IconColor.BLUE} />
              <p className="text-base font-bold text-dfxBlue-800">
                {translate('screens/kyc', 'Please fill in personal information to continue')}
              </p>
            </>
          )}

          <StyledInput
            name="mail"
            autocomplete="email"
            type="email"
            label={translate('screens/kyc', 'Email address')}
            placeholder={translate('screens/kyc', 'example@mail.com')}
            full
          />

          <StyledButton
            type="submit"
            label={translate('general/actions', 'Next')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isUpdating || isLoading}
          />
        </StyledVerticalStack>
      </Form>

      {error && (
        <div>
          <ErrorHint message={error} />
        </div>
      )}
    </StyledVerticalStack>
  );
}

function PersonalData({ rootRef, mode, code, isLoading, step, onDone, onBack }: EditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { getCountries, setPersonalData } = useKyc();
  const { countryCode } = useGeoLocation();

  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    getCountries(code)
      .then(setCountries)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsCountryLoading(false));
  }, []);

  useEffect(() => {
    const ipCountry = countries.find((c) => c.symbol === countryCode);
    if (ipCountry && !isDirty) {
      setValue('address.country', ipCountry);
      setValue('organizationAddress.country', ipCountry);
    }
  }, [countries, countryCode]);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid, isDirty, errors },
  } = useForm<KycPersonalData>({ mode: 'onTouched' });
  const selectedAccountType = useWatch({ control, name: 'accountType' });

  function onSubmit(data: KycPersonalData) {
    if (!step.session) return;

    setIsUpdating(true);
    setError(undefined);
    setPersonalData(code, step.session.url, data)
      .then(() => (mode === Mode.KYC ? onDone() : onBack()))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    accountType: Validations.Required,

    firstName: Validations.Required,
    lastName: Validations.Required,
    phone: [Validations.Required, Validations.Phone],

    ['address.street']: Validations.Required,
    ['address.zip']: Validations.Required,
    ['address.city']: Validations.Required,
    ['address.country']: Validations.Required,

    organizationName: Validations.Required,
    ['organizationAddress.street']: Validations.Required,
    ['organizationAddress.city']: Validations.Required,
    ['organizationAddress.zip']: Validations.Required,
    ['organizationAddress.country']: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full>
          <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
            {translate('screens/kyc', 'Account Type')}
          </p>
          <StyledDropdown
            rootRef={rootRef}
            name="accountType"
            label=""
            placeholder={translate('general/actions', 'Select...')}
            items={Object.values(AccountType)}
            labelFunc={(item) => translate('screens/kyc', item)}
          />
        </StyledVerticalStack>
        {selectedAccountType &&
          (isCountryLoading ? (
            <StyledLoadingSpinner size={SpinnerSize.LG} />
          ) : (
            <>
              <StyledVerticalStack gap={2} full>
                <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
                  {translate('screens/kyc', 'Personal Information')}
                </p>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="firstName"
                    autocomplete="firstname"
                    label={translate('screens/kyc', 'First name')}
                    placeholder={translate('screens/kyc', 'John')}
                    full
                    smallLabel
                  />
                  <StyledInput
                    name="lastName"
                    autocomplete="lastname"
                    label={translate('screens/kyc', 'Last name')}
                    placeholder={translate('screens/kyc', 'Doe')}
                    full
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="address.street"
                    autocomplete="street"
                    label={translate('screens/kyc', 'Street')}
                    placeholder={translate('screens/kyc', 'Street')}
                    full
                    smallLabel
                  />
                  <StyledInput
                    name="address.houseNumber"
                    autocomplete="house-number"
                    label={translate('screens/kyc', 'House nr.')}
                    placeholder="xx"
                    small
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="address.zip"
                    autocomplete="zip"
                    label={translate('screens/kyc', 'ZIP code')}
                    placeholder="12345"
                    small
                    smallLabel
                  />
                  <StyledInput
                    name="address.city"
                    autocomplete="city"
                    label={translate('screens/kyc', 'City')}
                    placeholder="Berlin"
                    full
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledSearchDropdown
                  rootRef={rootRef}
                  name="address.country"
                  autocomplete="country"
                  label={translate('screens/kyc', 'Country')}
                  placeholder={translate('general/actions', 'Select...')}
                  items={countries}
                  labelFunc={(item) => item.name}
                  filterFunc={(i, s) => !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))}
                  matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
                  smallLabel
                />
                <StyledInput
                  name="phone"
                  autocomplete="phone"
                  type="tel"
                  label={translate('screens/kyc', 'Mobile number')}
                  placeholder="+49 12345678"
                  smallLabel
                />
              </StyledVerticalStack>

              {selectedAccountType !== AccountType.PERSONAL && (
                <StyledVerticalStack gap={2} full>
                  <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
                    {translate('screens/kyc', 'Organization Information')}
                  </p>
                  <StyledInput
                    name="organizationName"
                    autocomplete="organization-name"
                    label={translate('screens/kyc', 'Organization name')}
                    placeholder={translate('screens/kyc', 'Example inc.')}
                    full
                    smallLabel
                  />
                  <StyledHorizontalStack gap={2}>
                    <StyledInput
                      name="organizationAddress.street"
                      autocomplete="street"
                      label={translate('screens/kyc', 'Street')}
                      placeholder={translate('screens/kyc', 'Street')}
                      full
                      smallLabel
                    />
                    <StyledInput
                      name="organizationAddress.houseNumber"
                      autocomplete="houseNumber"
                      label={translate('screens/kyc', 'House nr.')}
                      placeholder="xx"
                      small
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledHorizontalStack gap={2}>
                    <StyledInput
                      name="organizationAddress.zip"
                      autocomplete="zip"
                      type="number"
                      label={translate('screens/kyc', 'ZIP code')}
                      placeholder="12345"
                      small
                      smallLabel
                    />
                    <StyledInput
                      name="organizationAddress.city"
                      autocomplete="city"
                      label={translate('screens/kyc', 'City')}
                      placeholder="Berlin"
                      full
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledSearchDropdown
                    rootRef={rootRef}
                    name="organizationAddress.country"
                    autocomplete="country"
                    label={translate('screens/kyc', 'Country')}
                    placeholder={translate('general/actions', 'Select...')}
                    items={countries}
                    labelFunc={(item) => item.name}
                    filterFunc={(i, s) =>
                      !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))
                    }
                    matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
                    smallLabel
                  />
                </StyledVerticalStack>
              )}

              {error && (
                <div>
                  <ErrorHint message={error} />
                </div>
              )}

              <StyledButton
                type="submit"
                label={translate('general/actions', 'Next')}
                onClick={handleSubmit(onSubmit)}
                width={StyledButtonWidth.FULL}
                disabled={!isValid}
                isLoading={isUpdating || isLoading}
              />
            </>
          ))}
      </StyledVerticalStack>
    </Form>
  );
}

function LegalEntityData({ rootRef, code, isLoading, step, onDone }: EditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { setLegalEntityData } = useKyc();
  const { legalEntityToString } = useKycHelper();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycLegalEntityData>({ mode: 'onTouched' });

  function onSubmit(data: KycLegalEntityData) {
    if (!step.session) return;

    setIsUpdating(true);
    setError(undefined);
    setLegalEntityData(code, step.session.url, data)
      .then(onDone)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    legalEntity: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full center>
          <p className="w-full text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
            {translate('screens/kyc', 'Legal entity')}
          </p>
          <StyledDropdown
            rootRef={rootRef}
            name="legalEntity"
            full
            label=""
            placeholder={translate('general/actions', 'Select...')}
            items={Object.values(LegalEntity)}
            labelFunc={(item) => legalEntityToString(item)}
          />
        </StyledVerticalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating || isLoading}
        />
      </StyledVerticalStack>
    </Form>
  );
}

function NationalityData({ rootRef, code, isLoading, step, onDone }: EditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { setNationalityData } = useKyc();
  const { getCountries } = useKyc();

  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    getCountries(code)
      .then(setCountries)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsCountryLoading(false));
  }, []);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycNationalityData>({ mode: 'onTouched' });

  function onSubmit(data: KycNationalityData) {
    if (!step.session) return;

    setIsUpdating(true);
    setError(undefined);
    setNationalityData(code, step.session.url, data)
      .then(onDone)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    nationality: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full center>
          <p className="w-full text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
            {translate('screens/kyc', 'Nationality (according to identification document)')}
          </p>
          {isCountryLoading ? (
            <StyledLoadingSpinner size={SpinnerSize.LG} />
          ) : (
            <StyledSearchDropdown
              rootRef={rootRef}
              full
              name="nationality"
              autocomplete="nationality"
              label=""
              placeholder={translate('general/actions', 'Select...')}
              items={countries}
              labelFunc={(item) => item.name}
              filterFunc={(i, s) => !s || [i.name, i.symbol].some((w) => w.toLowerCase().includes(s.toLowerCase()))}
              matchFunc={(i, s) => i.name.toLowerCase() === s?.toLowerCase()}
            />
          )}
        </StyledVerticalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating || isLoading}
        />
      </StyledVerticalStack>
    </Form>
  );
}

interface FormDataFile {
  file: File;
}

function FileUpload({ code, isLoading, step, onDone }: EditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { nameToString } = useKycHelper();
  const { setFileData } = useKyc();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    resetField,
    formState: { isValid, errors },
  } = useForm<FormDataFile>({ mode: 'onChange' });

  async function onSubmit(data: FormDataFile) {
    if (!step.session) return;

    const fileData = { file: data.file && (await toBase64(data.file)), fileName: data.file?.name };
    if (!fileData.file) {
      setError('No file selected');
      return;
    }

    setIsUpdating(true);
    setError(undefined);
    setFileData(code, step.session.url, fileData as KycFileData)
      .then(onDone)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => {
        setIsUpdating(false);
        resetField('file');
      });
  }

  const rules = Utils.createRules({
    file: [
      Validations.Required,
      Validations.Custom((file) =>
        file?.type === 'application/pdf' ||
        file?.type === 'image/png' ||
        file?.type === 'image/jpg' ||
        file?.type === 'image/jpeg'
          ? true
          : 'file_type',
      ),
    ],
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full>
          <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
            {translate('screens/kyc', nameToString(step.name))}
          </p>
          <StyledFileUpload
            name="file"
            label=""
            placeholder={translate('general/actions', 'Drop files here')}
            buttonLabel={translate('general/actions', 'Browse')}
            full
          />
        </StyledVerticalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating || isLoading}
        />
      </StyledVerticalStack>
    </Form>
  );
}

function SignatoryPowerData({ rootRef, code, isLoading, step, onDone }: EditProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { setSignatoryPowerData } = useKyc();
  const { signatoryPowerToString } = useKycHelper();

  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<KycSignatoryPowerData>({ mode: 'onTouched' });

  function onSubmit(data: KycSignatoryPowerData) {
    if (!step.session) return;

    setIsUpdating(true);
    setError(undefined);
    setSignatoryPowerData(code, step.session.url, data)
      .then(onDone)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    signatoryPower: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full center>
          <p className="w-full text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
            {translate('screens/kyc', 'Signatory power')}
          </p>
          <StyledDropdown
            rootRef={rootRef}
            name="signatoryPower"
            full
            label=""
            placeholder={translate('general/actions', 'Select...')}
            items={Object.values(SignatoryPower)}
            labelFunc={(item) => signatoryPowerToString(item)}
          />
        </StyledVerticalStack>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isUpdating || isLoading}
        />
      </StyledVerticalStack>
    </Form>
  );
}

function Ident({ step, lang, onDone, onBack, onError }: EditProps): JSX.Element {
  // listen to close events
  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('keydown', onMessage);
  }, []);

  function onMessage(e: Event) {
    const message = (e as MessageEvent<{ type: string; status: KycStepStatus }>).data;
    if (message.type === IframeMessageType) isStepDone(message) ? onDone() : onBack();
  }

  return step.session ? (
    step.session.type === UrlType.TOKEN ? (
      <SumsubWebSdk
        className="w-full h-full max-h-[900px]"
        accessToken={step.session.url}
        expirationHandler={() => onError('Token expired')}
        config={{ lang: lang.symbol.toLowerCase() }}
        onMessage={(type: string, payload: any) =>
          type === 'idCheck.onApplicantStatusChanged' &&
          ['pending', 'completed'].includes(payload?.reviewStatus) &&
          onDone()
        }
        onError={onError}
      />
    ) : (
      <iframe
        src={step.session.url}
        allow="camera *; microphone *"
        allowFullScreen={true}
        className="w-full h-full max-h-[900px]"
      ></iframe>
    )
  ) : (
    <ErrorHint message="No session URL" />
  );
}

interface FormData {
  text?: string;
  selection?: KycFinancialOption;
  selectionMC?: KycFinancialOption[];
}

function FinancialData({ rootRef, code, step, onDone, onBack }: EditProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { language } = useSettingsContext();
  const { getFinancialData, setFinancialData } = useKyc();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [questions, setQuestions] = useState<KycFinancialQuestion[]>([]);
  const [responses, setResponses] = useState<KycFinancialResponse[]>([]);
  const [index, setIndex] = useState<number>();

  const currentQuestion = index != null ? questions[index - 1] : undefined;
  const currentOptions = currentQuestion?.options ?? [];
  const currentResponse = responses.find((r) => currentQuestion?.key === r.key);
  const nocLinkText = 'services.dfx.swiss/support/issue';
  const nocSupportLink = `${process.env.PUBLIC_URL}/support/issue?issue-type=${SupportIssueType.NOTIFICATION_OF_CHANGES}`;

  useEffect(() => {
    if (!step.session) return;

    setIsLoading(true);
    getFinancialData(code, step.session.url, language?.symbol)
      .then(({ questions, responses }) => {
        setQuestions(questions);
        setResponses(responses);

        const currentQuestion = questions.find((q) => !responses.find((r) => q.key === r.key));
        currentQuestion && setIndex(questions.indexOf(currentQuestion) + 1);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [code, language]);

  useEffect(() => {
    if (!step.session) return;

    responses.length &&
      setFinancialData(code, step.session.url, { responses })
        .then((r) => isStepDone(r) && onDone())
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [responses]);

  useEffect(() => {
    setValue(currentResponse?.value);
  }, [currentQuestion]);

  const { control, handleSubmit, setValue: setFormValue, reset } = useForm<FormData>({ mode: 'onTouched' });

  const currentText = useWatch({ control, name: 'text' });
  const currentSelection = useWatch({ control, name: 'selection' })?.key;
  const currentSelectionMC = useWatch({ control, name: 'selectionMC' })?.map((o) => o.key);
  const currentValue = currentText ?? currentSelection ?? (currentSelectionMC?.length ? currentSelectionMC : undefined);

  function onSubmit({ text, selection, selectionMC }: FormData) {
    const value = text ?? selection?.key ?? selectionMC?.map((o) => o.key).join(',');
    if (!currentQuestion || !value) return;

    if (!currentResponse) {
      setResponses((r) => [...r, { key: currentQuestion.key, value }]);
    } else if (currentResponse.value !== value) {
      currentResponse.value = value;
      setResponses((r) => [...r]);
    }

    setIndex((i) => i && i + 1);
    reset();
  }

  function goBack() {
    setIndex((i) => i && i - 1);
  }

  function setValue(value?: string) {
    const isText = !currentQuestion?.options?.length;
    const isMC = currentQuestion?.type === QuestionType.MULTIPLE_CHOICE;

    setFormValue('text', isText ? value : undefined);
    setFormValue('selection', !isText && !isMC ? currentQuestion?.options?.find((o) => o.key === value) : undefined);
    setFormValue(
      'selectionMC',
      isMC ? currentQuestion?.options?.filter((o) => value?.split(',').includes(o.key)) : undefined,
    );
  }

  return error ? (
    <StyledVerticalStack gap={6} full center>
      <div>
        <ErrorHint message={error} />
      </div>
      <StyledButton
        width={StyledButtonWidth.MIN}
        label={translate('general/actions', 'Back')}
        onClick={onBack}
        color={StyledButtonColor.STURDY_WHITE}
      />
    </StyledVerticalStack>
  ) : index && currentQuestion && !isLoading ? (
    <Form control={control} errors={{}} onSubmit={handleSubmit(onSubmit)}>
      <StyledVerticalStack gap={6} full center>
        <div className="w-full flex flex-row items-center justify-between">
          {index > 1 ? <StyledIconButton icon={IconVariant.CHEV_LEFT} size={IconSize.XL} onClick={goBack} /> : <div />}
          <h2 className="text-dfxGray-700">{currentQuestion.title}</h2>
          <p className="text-dfxGray-700">
            {index}/{questions.length}
          </p>
        </div>

        {currentQuestion.type === QuestionType.CONFIRMATION ? (
          <StyledCheckboxRow
            isChecked={currentSelection === currentOptions[0].key}
            onChange={(checked) => setValue(checked ? currentOptions[0].key : undefined)}
          >
            {currentQuestion.key === 'tnc' ? (
              <StyledLink label={currentQuestion.description} url={process.env.REACT_APP_TNC_URL} dark />
            ) : currentQuestion.key === 'notification_of_changes' ? (
              <div>
                {currentQuestion.description.split(nocLinkText)[0]}
                <StyledLink label={nocLinkText} onClick={() => window.open(nocSupportLink, '_blank')} dark />
                {currentQuestion.description.split(nocLinkText)[1]}
              </div>
            ) : (
              currentQuestion.description
            )}
          </StyledCheckboxRow>
        ) : currentQuestion.type === QuestionType.SINGLE_CHOICE ? (
          <>
            <StyledDropdown
              name="selection"
              rootRef={rootRef}
              label={currentQuestion.description}
              placeholder={translate('general/actions', 'Select...')}
              items={currentOptions}
              labelFunc={(item) => item.text}
              full
            />
          </>
        ) : currentQuestion.type === QuestionType.MULTIPLE_CHOICE ? (
          <StyledDropdownMultiChoice
            name="selectionMC"
            rootRef={rootRef}
            label={currentQuestion.description}
            placeholder={translate('general/actions', 'Select...')}
            items={currentOptions}
            labelFunc={(item) => item.text}
            full
          />
        ) : (
          <StyledInput name="text" label={currentQuestion.description} full />
        )}
        <StyledButton
          type="submit"
          label={translate('general/actions', 'Next')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!currentValue}
        />
      </StyledVerticalStack>
    </Form>
  ) : (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  );
}

function DocumentUpload({}: EditProps): JSX.Element {
  return <>TODO</>;
}
