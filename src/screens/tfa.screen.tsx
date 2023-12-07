import { ApiError, KycInfo, Utils, Validations, useKyc, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledInput,
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
  const { getKycInfo } = useKyc();
  const { search } = useLocation();
  const { goBack } = useNavigation();

  const [info, setInfo] = useState<KycInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [step, setStep] = useState(0);

  const [setupInfo, setSetupInfo] = useState<{ link: string; code: string }>();

  const lastStep = 3;
  const params = new URLSearchParams(search);
  const kycCode = params.get('code') ?? user?.kycHash;

  useSessionGuard('/login', !kycCode);

  useEffect(() => {
    if (!kycCode) return;

    getKycInfo(kycCode)
      .then(setInfo)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [kycCode]);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<{ code: string }>({ mode: 'onTouched' });

  const rules = Utils.createRules({
    code: [Validations.Required, Validations.Custom((v: string) => (v?.length === 6 ? true : 'pattern'))],
  });

  async function onNext(data?: { code: string }) {
    if (info?.twoFactorEnabled) {
      if (!data) return;
      await submitCode(data.code);
      return goBack();
    }

    switch (step) {
      case 0:
        await fetchSetupInfo();
        break;

      case 2:
        if (!data) return;
        await submitCode(data.code);
        break;

      case 3:
        goBack();
        break;
    }

    setStep((s) => s + 1);
  }

  async function fetchSetupInfo() {
    setIsSubmitting(true);
    setSetupInfo({ link: 'TODO', code: 'EFIE EF3I DF02 02OF' });
    setIsSubmitting(false);
  }

  async function submitCode(_code: string) {
    setIsSubmitting(true);
    setIsSubmitting(false);
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
            {info && (
              <>
                <h2 className="text-dfxGray-700">{titleString(info)}</h2>
                {info.twoFactorEnabled || step === 2 ? (
                  <>
                    <p className="text-dfxGray-700">
                      {translate('screens/kyc', 'Enter the 6-digit code from your authenticator app.')}
                    </p>
                    <StyledInput
                      name="code"
                      type="number"
                      placeholder={translate('screens/kyc', 'Authenticator code')}
                      full
                    />
                  </>
                ) : step === 0 ? (
                  <p className="text-dfxGray-700">
                    {translate(
                      'screens/kyc',
                      'Install a compatible authenticator app (e.g. Google Authenticator) on your mobile device.',
                    )}
                  </p>
                ) : step === 1 ? (
                  setupInfo && (
                    <>
                      <QRCode
                        className="mx-auto h-auto w-full max-w-[15rem]"
                        value={setupInfo.link}
                        size={128}
                        fgColor={'#072440'}
                      />
                      <div>
                        <p className="text-dfxGray-700">
                          {translate(
                            'screens/kyc',
                            'Scan the QR code with your app or enter the following code manually.',
                          )}
                        </p>
                        <p className="text-dfxGray-800 italic">{setupInfo.code}</p>
                      </div>
                    </>
                  )
                ) : (
                  step === 3 && (
                    <>
                      <p className="text-dfxGray-700">
                        {translate('screens/kyc', 'You  have successfully activated two-factor authentication.')}
                      </p>
                    </>
                  )
                )}

                <StyledButton
                  type={info.twoFactorEnabled || step === 2 ? 'submit' : 'button'}
                  width={StyledButtonWidth.MIN}
                  label={translate('general/actions', step === lastStep ? 'Finish' : 'Next')}
                  onClick={onNext}
                  isLoading={isSubmitting}
                  disabled={!isValid}
                />
              </>
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
