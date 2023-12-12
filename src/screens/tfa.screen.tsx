import { ApiError, KycInfo, TfaSetup, Utils, Validations, useKyc, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledHorizontalStack,
  StyledInput,
  StyledLink,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function TfaScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { getKycInfo, setup2fa, delete2fa, verify2fa } = useKyc();
  const { search } = useLocation();
  const { goBack } = useNavigation();

  const [info, setInfo] = useState<KycInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [step, setStep] = useState(0);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);

  const [setupInfo, setSetupInfo] = useState<TfaSetup>();

  const lastStep = 3;
  const params = new URLSearchParams(search);
  const kycCode = params.get('code') ?? user?.kycHash;

  useSessionGuard('/login', !kycCode);

  useEffect(() => {
    load();
  }, [kycCode]);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
    reset,
  } = useForm<{ token: string }>({ mode: 'onTouched' });

  const rules = Utils.createRules({
    token: [Validations.Required, Validations.Custom((v: string) => (v?.length === 6 ? true : 'pattern'))],
  });

  async function load(): Promise<void> {
    if (!kycCode) return;

    return getKycInfo(kycCode)
      .then(setInfo)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }

  async function onNext(data?: { token: string }) {
    setError(undefined);
    setTokenInvalid(false);
    setIsSubmitting(true);
    next(data?.token)
      .then(() => setStep((s) => s + 1))
      .catch((e: ApiError) => {
        e.statusCode === 401 ? setTokenInvalid(true) : setError(e.message ?? 'Unknown error');
      })
      .finally(() => setIsSubmitting(false));
  }

  async function next(token?: string): Promise<void> {
    if (!kycCode) return;

    if (info?.twoFactorEnabled) {
      if (!token) return;
      await verify2fa(kycCode, token);
      return goBack();
    }

    switch (step) {
      case 0:
        await setup2fa(kycCode).then(setSetupInfo);
        break;

      case 2:
        if (!token) return;
        await verify2fa(kycCode, token);
        break;

      case 3:
        goBack();
        break;
    }
  }

  function onDelete() {
    if (!kycCode) return;
    delete2fa(kycCode)
      .then(() => load())
      .then(() => {
        reset();
        setShowDeleteMessage(false);
      })
      .catch((e: ApiError) => setError(e.message ?? 'Unknown error'));
  }

  function title(info: KycInfo): [boolean, string] {
    if (info.twoFactorEnabled) return [false, 'Two-factor authentication required'];

    switch (step) {
      case 0:
        return [true, 'Install authenticator app'];
      case 1:
        return [true, 'Scan the QR code'];
      case 2:
        return [true, 'Verify setup'];
      case 3:
        return [false, 'Done!'];
    }

    return [false, ''];
  }

  function titleString(info: KycInfo): string {
    const [hasStepIndicator, text] = title(info);
    return (
      (hasStepIndicator ? translate('screens/kyc', 'Step {{step}}: ', { step: step + 1 }) : '') +
      translate('screens/kyc', text)
    );
  }

  return (
    <Layout
      title={translate('screens/kyc', '2FA')}
      onBack={step > 0 && step !== lastStep ? () => setStep((s) => s - 1) : undefined}
    >
      {isLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onNext)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            {showDeleteMessage ? (
              <>
                <p className="text-dfxBlue-800">
                  {translate('screens/buy', 'Are you sure you want to delete your 2FA method?')}
                </p>
                <StyledHorizontalStack>
                  <StyledButton
                    type="button"
                    color={StyledButtonColor.STURDY_WHITE}
                    width={StyledButtonWidth.MIN}
                    label={translate('general/actions', 'No')}
                    onClick={() => setShowDeleteMessage(false)}
                  />
                  <StyledButton
                    type="button"
                    width={StyledButtonWidth.MIN}
                    label={translate('general/actions', 'Yes')}
                    onClick={onDelete}
                  />
                </StyledHorizontalStack>
              </>
            ) : (
              info && (
                <>
                  <h2 className="text-dfxGray-700">{titleString(info)}</h2>
                  {info.twoFactorEnabled || step === 2 ? (
                    <>
                      <p className="text-dfxGray-700">
                        {translate('screens/kyc', 'Please enter the 6-digit code from your authenticator app')}
                      </p>
                      <StyledInput
                        name="token"
                        type="number"
                        placeholder={translate('screens/kyc', 'Authenticator code')}
                        forceError={tokenInvalid}
                        forceErrorMessage={
                          tokenInvalid ? translate('screens/kyc', 'Invalid or expired code') : undefined
                        }
                        full
                      />
                    </>
                  ) : step === 0 ? (
                    <p className="text-dfxGray-700">
                      {translate(
                        'screens/kyc',
                        'Please install a compatible authenticator app (e.g. Google Authenticator) on your mobile device',
                      )}
                    </p>
                  ) : step === 1 ? (
                    setupInfo && (
                      <>
                        <QRCode
                          className="mx-auto h-auto w-full max-w-[15rem]"
                          value={setupInfo.uri}
                          size={128}
                          fgColor={'#072440'}
                        />
                        <div>
                          <p className="text-dfxGray-700">
                            {translate(
                              'screens/kyc',
                              'Please scan the QR code with your app or enter the following code manually',
                            )}
                          </p>
                          <p className="text-dfxGray-800 italic">{setupInfo.secret}</p>
                        </div>
                      </>
                    )
                  ) : (
                    step === 3 && (
                      <p className="text-dfxGray-700">
                        {translate('screens/kyc', 'You have successfully activated two-factor authentication')}
                      </p>
                    )
                  )}

                  <StyledVerticalStack gap={2} full center>
                    <StyledButton
                      type={info.twoFactorEnabled || step === 2 ? 'submit' : 'button'}
                      width={StyledButtonWidth.MIN}
                      label={translate('general/actions', step === lastStep ? 'Finish' : 'Next')}
                      onClick={handleSubmit(onNext)}
                      isLoading={isSubmitting}
                      disabled={!isValid}
                    />
                    {info.twoFactorEnabled && (
                      <StyledLink
                        label={translate('screens/kyc', 'Delete 2FA method')}
                        onClick={() => setShowDeleteMessage(true)}
                        dark
                      />
                    )}
                  </StyledVerticalStack>
                </>
              )
            )}
            {error && (
              <div>
                <ErrorHint message={error} />
              </div>
            )}
          </StyledVerticalStack>
        </Form>
      )}
    </Layout>
  );
}
