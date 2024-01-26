import { ApiError, KycInfo, TfaSetup, Utils, Validations, useKyc, useUserContext } from '@dfx.swiss/react';
import {
  CopyButton,
  Form,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
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
import { useClipboard } from '../hooks/clipboard.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function TfaScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { getKycInfo, setup2fa, verify2fa } = useKyc();
  const { search } = useLocation();
  const { copy } = useClipboard();
  const { goBack } = useNavigation();

  const [info, setInfo] = useState<KycInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenInvalid, setTokenInvalid] = useState(false);

  const [setupInfo, setSetupInfo] = useState<TfaSetup>();

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
  } = useForm<{ token: string }>({ mode: 'onTouched' });

  const rules = Utils.createRules({
    token: [Validations.Required, Validations.Custom((v: string) => (v?.length === 6 ? true : 'pattern'))],
  });

  async function load(): Promise<void> {
    if (!kycCode) return;

    return getKycInfo(kycCode)
      .then((i) => {
        setInfo(i);
        if (!i.twoFactorEnabled) return setup2fa(kycCode).then(setSetupInfo);
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }

  async function onSubmit(data: { token: string }) {
    if (!kycCode) return;

    setError(undefined);
    setTokenInvalid(false);
    setIsSubmitting(true);

    verify2fa(kycCode, data.token)
      .then(() => goBack())
      .catch((e: ApiError) => (e.statusCode === 401 ? setTokenInvalid(true) : setError(e.message ?? 'Unknown error')))
      .finally(() => setIsSubmitting(false));
  }

  function openAppStore(url: string) {
    window.open(url, '_blank', 'noreferrer');
  }

  return (
    <Layout title={translate('screens/2fa', '2FA')}>
      {isLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <div className="text-left">
            <StyledVerticalStack gap={10} full>
              {info && (
                <>
                  {setupInfo && (
                    <>
                      {/* step 1 */}
                      <StyledVerticalStack gap={4} full>
                        <h2 className="text-dfxGray-700">
                          <span className="text-dfxGray-800">
                            {translate('screens/2fa', 'Step {{step}}', { step: 1 })}
                            {': '}
                          </span>
                          <span className="font-medium">
                            {translate(
                              'screens/2fa',
                              'Install Google Authenticator or another 2FA app on your smartphone',
                            )}
                          </span>
                        </h2>
                        <div className="flex flex-row flex-wrap gap-2">
                          <StyledButton
                            icon={IconVariant.APPLE}
                            label="App Store"
                            color={StyledButtonColor.STURDY_WHITE}
                            width={StyledButtonWidth.MIN}
                            onClick={() =>
                              openAppStore('https://apps.apple.com/de/app/google-authenticator/id388497605')
                            }
                            deactivateMargin
                          />
                          <StyledButton
                            icon={IconVariant.GOOGLE_PLAY}
                            label="Google Play"
                            color={StyledButtonColor.STURDY_WHITE}
                            width={StyledButtonWidth.MIN}
                            onClick={() =>
                              openAppStore(
                                'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2',
                              )
                            }
                            deactivateMargin
                          />
                        </div>
                      </StyledVerticalStack>

                      {/* step 2 */}
                      <StyledVerticalStack gap={4} full>
                        <h2 className="text-dfxGray-700">
                          <span className="text-dfxGray-800">
                            {translate('screens/2fa', 'Step {{step}}', { step: 2 })}
                            {': '}
                          </span>
                          <span className="font-medium">
                            {translate('screens/2fa', 'Set up the 2FA authenticator')}
                          </span>
                        </h2>
                        <p className="text-dfxGray-700">
                          {translate(
                            'screens/2fa',
                            'Click + in Google Authenticator to add a new account. You can scan the QR code or enter the secret provided to create your account in Google Authenticator.',
                          )}
                        </p>
                        <QRCode
                          className="mx-auto h-auto w-full max-w-[15rem]"
                          value={setupInfo.uri}
                          size={128}
                          fgColor={'#072440'}
                        />
                        <StyledVerticalStack full center>
                          <p className="text-dfxGray-800 italic">{translate('screens/2fa', 'Secret')}:</p>
                          <div className="flex flex-row items-center gap-2 px-4">
                            <p className="text-dfxGray-800 italic break-all">{setupInfo.secret}</p>
                            <CopyButton onCopy={() => copy(setupInfo.secret)} />
                          </div>
                        </StyledVerticalStack>
                      </StyledVerticalStack>
                    </>
                  )}

                  {/* step 3 */}
                  <StyledVerticalStack gap={4} full>
                    <h2 className="text-dfxGray-700">
                      {setupInfo && (
                        <span className="text-dfxGray-800">
                          {translate('screens/2fa', 'Step {{step}}', { step: 3 })}
                          {': '}
                        </span>
                      )}
                      <span className="font-medium">
                        {translate('screens/2fa', 'Enter the 6-digit dynamic code from your authenticator app')}
                      </span>
                    </h2>
                    <StyledInput
                      name="token"
                      type="number"
                      placeholder={translate('screens/2fa', 'Authenticator code')}
                      forceError={tokenInvalid}
                      forceErrorMessage={tokenInvalid ? translate('screens/2fa', 'Invalid or expired code') : undefined}
                      full
                    />

                    <StyledVerticalStack gap={2} full center>
                      <StyledButton
                        type="submit"
                        width={StyledButtonWidth.MIN}
                        label={translate('general/actions', 'Next')}
                        onClick={handleSubmit(onSubmit)}
                        isLoading={isSubmitting}
                        disabled={!isValid}
                      />
                    </StyledVerticalStack>
                  </StyledVerticalStack>
                </>
              )}
              {error && (
                <StyledVerticalStack full center>
                  <ErrorHint message={error} />
                </StyledVerticalStack>
              )}
            </StyledVerticalStack>
          </div>
        </Form>
      )}
    </Layout>
  );
}
