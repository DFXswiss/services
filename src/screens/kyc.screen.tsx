import { ApiError, Country, Utils, Validations, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  DfxIcon,
  Form,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledCheckboxRow,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledHorizontalStack,
  StyledIconButton,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { Fragment, RefObject, useEffect, useRef, useState } from 'react';
import { isMobile } from 'react-device-detect';
import { useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { IframeMessageType } from './iframe-message.screen';
import {
  AccountType,
  KycContactData,
  KycFinancialOption,
  KycFinancialQuestion,
  KycFinancialResponse,
  KycInfo,
  KycPersonalData,
  KycStep,
  KycStepName,
  KycStepStatus,
  QuestionType,
  UrlType,
  isStepDone,
  useKyc,
} from './tmp/kyc.hook';

export function KycScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { user } = useUserContext();
  const { levelToString, limitToString, nameToString, typeToString, getKycInfo, continueKyc } = useKyc();

  const [info, setInfo] = useState<KycInfo>();
  const [isLoading, setIsLoading] = useState(false);
  const [stepInProgress, setStepInProgress] = useState<KycStep>();
  const [error, setError] = useState<string>();

  const rootRef = useRef<HTMLDivElement>(null);
  const kycCode = user?.kycHash ?? undefined;
  const kycStarted = info?.kycSteps.some((s) => s.status !== KycStepStatus.NOT_STARTED);
  const kycCompleted = info?.kycSteps.every((s) => isStepDone(s));

  useEffect(() => {
    if (kycCode)
      getKycInfo(kycCode)
        .then(setInfo)
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [kycCode]);

  function onLoad(next: boolean) {
    if (!kycCode) return;

    setIsLoading(true);
    setError(undefined);
    (next ? continueKyc(kycCode) : getKycInfo(kycCode))
      .then(setData)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }

  function setData(info: KycInfo) {
    setInfo(info);
    setStepInProgress(info.currentStep);
  }

  function stepIcon(step: KycStep): { icon: IconVariant; size: IconSize } | undefined {
    switch (step.status) {
      case KycStepStatus.NOT_STARTED:
        return undefined;

      case KycStepStatus.IN_PROGRESS:
        return { icon: IconVariant.EDIT, size: IconSize.MD };

      case KycStepStatus.IN_REVIEW:
        return { icon: IconVariant.LOADING, size: IconSize.XS };

      case KycStepStatus.COMPLETED:
        return { icon: IconVariant.CHECK, size: IconSize.MD };

      case KycStepStatus.FAILED:
        return { icon: IconVariant.CLOSE, size: IconSize.MD };
    }
  }

  return (
    <Layout
      title={stepInProgress ? nameToString(stepInProgress.name) : translate('screens/kyc', 'DFX KYC')}
      rootRef={rootRef}
      onBack={stepInProgress ? () => setStepInProgress(undefined) : undefined}
      noPadding={isMobile && stepInProgress?.session?.type === UrlType.BROWSER}
    >
      {!kycCode || !info ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : stepInProgress ? (
        <KycEdit
          rootRef={rootRef}
          code={kycCode}
          isLoading={isLoading}
          step={stepInProgress}
          onDone={onLoad}
          onBack={() => setStepInProgress(undefined)}
        />
      ) : (
        <StyledVerticalStack gap={6} full center>
          <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
            <StyledDataTableRow label={translate('screens/kyc', 'KYC level')}>
              <p>{levelToString(info.kycLevel)}</p>
            </StyledDataTableRow>

            <StyledDataTableRow label={translate('screens/kyc', 'Trading limit')}>
              <p>{limitToString(info.tradingLimit)}</p>
            </StyledDataTableRow>

            <StyledDataTableRow label={translate('screens/kyc', 'KYC progress')}>
              <div className="grid gap-1 items-center grid-cols-[1.2rem_1fr]">
                {info.kycSteps.map((step) => {
                  const icon = stepIcon(step);
                  return (
                    <Fragment key={`${step.name}-${step.type}`}>
                      {icon ? <DfxIcon {...icon} /> : <div />}
                      <div className={`text-left ${info.currentStep?.name === step.name && 'font-bold'}`}>
                        {nameToString(step.name)}
                        {step.type && ` (${typeToString(step.type)})`}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </StyledDataTableRow>
          </StyledDataTable>

          {error && (
            <div>
              <ErrorHint message={error} />
            </div>
          )}

          {!kycCompleted && (
            <StyledButton
              width={StyledButtonWidth.MIN}
              label={translate('general/actions', kycStarted ? 'Continue' : 'Start')}
              isLoading={isLoading}
              onClick={() => onLoad(true)}
            />
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

interface EditProps {
  rootRef: RefObject<HTMLDivElement>;
  code: string;
  isLoading: boolean;
  step: KycStep;
  onDone: (next: boolean) => void;
  onBack: () => void;
}

function KycEdit(props: EditProps): JSX.Element {
  switch (props.step.name) {
    case KycStepName.CONTACT_DATA:
      return <ContactData {...props} />;

    case KycStepName.PERSONAL_DATA:
      return <PersonalData {...props} />;

    case KycStepName.IDENT:
      return <Ident {...props} />;

    case KycStepName.FINANCIAL_DATA:
      return <FinancialData {...props} />;

    case KycStepName.DOCUMENT_UPLOAD:
      return <DocumentUpload {...props} />;
  }
}

function ContactData({ code, isLoading, step, onDone, onBack }: EditProps): JSX.Element {
  const { translate } = useSettingsContext();
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
      .then((r) => onDone(isStepDone(r)))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    mail: [Validations.Required, Validations.Mail],
  });

  return step.status === KycStepStatus.FAILED ? (
    <StyledVerticalStack gap={6} full>
      <p className="text-dfxGray-700">
        {translate(
          'screens/kyc',
          'It looks like you already have an account with DFX. We have just sent you an E-Mail. Click on the sent link to add the current address to your account.',
        )}
      </p>
      <StyledButton width={StyledButtonWidth.MIN} label={translate('general/actions', 'OK')} onClick={onBack} />
    </StyledVerticalStack>
  ) : (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
      <StyledVerticalStack gap={6} full>
        <StyledInput
          name="mail"
          autocomplete="email"
          type="email"
          label={translate('screens/kyc', 'Email address')}
          placeholder={translate('screens/kyc', 'example@mail.com')}
        />

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

function PersonalData({ rootRef, code, isLoading, step, onDone }: EditProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { getCountries, setPersonalData } = useKyc();

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
  } = useForm<KycPersonalData>({ mode: 'onTouched' });
  const selectedAccountType = useWatch({ control, name: 'accountType' });

  function onSubmit(data: KycPersonalData) {
    if (!step.session) return;

    setIsUpdating(true);
    setError(undefined);
    setPersonalData(code, step.session.url, data)
      .then(() => onDone(true))
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsUpdating(false));
  }

  const rules = Utils.createRules({
    accountType: Validations.Required,

    firstName: Validations.Required,
    lastName: Validations.Required,
    phone: [Validations.Required, Validations.Phone],

    ['address.street']: Validations.Required,
    ['address.houseNumber']: Validations.Required,
    ['address.zip']: Validations.Required,
    ['address.city']: Validations.Required,
    ['address.country']: Validations.Required,

    organizationName: Validations.Required,
    ['organizationAddress.street']: Validations.Required,
    ['organizationAddress.houseNumber']: Validations.Required,
    ['organizationAddress.city']: Validations.Required,
    ['organizationAddress.zip']: Validations.Required,
    ['organizationAddress.country']: Validations.Required,
  });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)}>
      <StyledVerticalStack gap={6} full center>
        <StyledVerticalStack gap={2} full>
          <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
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
        </StyledVerticalStack>
        {selectedAccountType &&
          (isCountryLoading ? (
            <StyledLoadingSpinner size={SpinnerSize.LG} />
          ) : (
            <>
              <StyledVerticalStack gap={2} full>
                <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
                  {translate('screens/profile', 'Personal Information')}
                </p>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="firstName"
                    autocomplete="firstname"
                    label={translate('screens/profile', 'First name')}
                    placeholder={translate('screens/profile', 'John')}
                    full
                    smallLabel
                  />
                  <StyledInput
                    name="lastName"
                    autocomplete="lastname"
                    label={translate('screens/profile', 'Last name')}
                    placeholder={translate('screens/profile', 'Doe')}
                    full
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="address.street"
                    autocomplete="street"
                    label={translate('screens/profile', 'Street')}
                    placeholder={translate('screens/profile', 'Street')}
                    full
                    smallLabel
                  />
                  <StyledInput
                    name="address.houseNumber"
                    autocomplete="house-number"
                    label={translate('screens/profile', 'House nr.')}
                    placeholder="xx"
                    small
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledHorizontalStack gap={2}>
                  <StyledInput
                    name="address.zip"
                    autocomplete="zip"
                    type="number"
                    label={translate('screens/profile', 'ZIP code')}
                    placeholder="12345"
                    small
                    smallLabel
                  />
                  <StyledInput
                    name="address.city"
                    autocomplete="city"
                    label={translate('screens/profile', 'City')}
                    placeholder="Berlin"
                    full
                    smallLabel
                  />
                </StyledHorizontalStack>
                <StyledDropdown
                  rootRef={rootRef}
                  name="address.country"
                  label={translate('screens/profile', 'Country')}
                  placeholder={translate('general/actions', 'Select...')}
                  items={countries}
                  labelFunc={(item) => item.name}
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
              </StyledVerticalStack>

              {selectedAccountType !== AccountType.PERSONAL && (
                <StyledVerticalStack gap={2} full>
                  <p className="text-dfxGray-700 text-xs font-semibold uppercase text-start ml-3">
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
                      name="organizationAddress.street"
                      autocomplete="street"
                      label={translate('screens/profile', 'Street')}
                      placeholder={translate('screens/profile', 'Street')}
                      full
                      smallLabel
                    />
                    <StyledInput
                      name="organizationAddress.houseNumber"
                      autocomplete="houseNumber"
                      label={translate('screens/profile', 'House nr.')}
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
                      label={translate('screens/profile', 'ZIP code')}
                      placeholder="12345"
                      small
                      smallLabel
                    />
                    <StyledInput
                      name="organizationAddress.city"
                      autocomplete="city"
                      label={translate('screens/profile', 'City')}
                      placeholder="Berlin"
                      full
                      smallLabel
                    />
                  </StyledHorizontalStack>
                  <StyledDropdown
                    rootRef={rootRef}
                    name="organizationAddress.country"
                    label={translate('screens/profile', 'Country')}
                    placeholder={translate('general/actions', 'Select...')}
                    items={countries}
                    labelFunc={(item) => item.name}
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

function Ident({ step, onDone }: EditProps): JSX.Element {
  // listen to close events
  useEffect(() => {
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('keydown', onMessage);
  }, []);

  function onMessage(e: Event) {
    const message = (e as MessageEvent<{ type: string; status: KycStepStatus }>).data;
    if (message.type === IframeMessageType) onDone(isStepDone(message));
  }

  return step.session ? (
    <>
      <iframe
        src={step.session?.url}
        allow="camera *; microphone *"
        allowFullScreen={false}
        className="w-full h-full max-h-[900px]"
      ></iframe>
    </>
  ) : (
    <ErrorHint message="No session URL" />
  );
}

interface FormData {
  text?: string;
  selection?: KycFinancialOption;
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
        .then((r) => isStepDone(r) && onDone(true))
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
  }, [responses]);

  useEffect(() => {
    setValue(currentResponse?.value);
  }, [currentQuestion]);

  const { control, handleSubmit, setValue: setFormValue, reset } = useForm<FormData>({ mode: 'onTouched' });

  const currentText = useWatch({ control, name: 'text' });
  const currentSelection = useWatch({ control, name: 'selection' })?.key;
  const currentValue = currentText ?? currentSelection;

  function onSubmit({ text, selection }: FormData) {
    const value = text ?? selection?.key;
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
    if (currentQuestion?.options?.length) {
      setFormValue(
        'selection',
        currentQuestion.options.find((o) => o.key === value),
      );
      setFormValue('text', undefined);
    } else {
      setFormValue('selection', undefined);
      setFormValue('text', value);
    }
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
            {currentQuestion.description}
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
          <StyledDropdown
            name="selection"
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
