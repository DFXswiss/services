import { ApiError, KycInfo, TfaSetup, Utils, Validations, useKyc, useUserContext } from '@dfx.swiss/react';
import {
  CopyButton,
  Form,
  IconVariant,
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
import { useClipboard } from '../hooks/clipboard.hook';
import { useSessionGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';

export function TfaScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { getKycInfo, setup2fa, delete2fa, verify2fa } = useKyc();
  const { search } = useLocation();
  const { copy } = useClipboard();
  const { goBack } = useNavigation();

  const [info, setInfo] = useState<KycInfo>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);

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
    reset,
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

  function onDelete() {
    if (!kycCode) return;

    setIsLoading(true);

    delete2fa(kycCode)
      .then(() => load())
      .then(() => reset())
      .then(() => setShowDeleteMessage(false))
      .catch((e: ApiError) => setError(e.message ?? 'Unknown error'));
  }

  return (
    <Layout title={translate('screens/kyc', '2FA')}>
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
              {showDeleteMessage ? (
                <StyledVerticalStack gap={6} full center>
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
                </StyledVerticalStack>
              ) : (
                info && (
                  <>
                    {setupInfo && (
                      <>
                        {/* step 1 */}
                        <StyledVerticalStack gap={4} full>
                          <h2 className="text-dfxGray-700">
                            {translate('screens/kyc', 'Step {{step}}', { step: 1 })}
                            {': '}
                            {translate(
                              'screens/kyc',
                              'Install Google Authenticator or another 2FA app on your smartphone',
                            )}
                          </h2>
                          <div className="flex flex-row flex-wrap gap-2">
                            <StyledButton
                              type="button"
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
                              type="button"
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
                          {/* TODO: store links */}
                        </StyledVerticalStack>

                        {/* step 2 */}
                        <StyledVerticalStack gap={4} full>
                          <h2 className="text-dfxGray-700">
                            {translate('screens/kyc', 'Step {{step}}', { step: 2 })}
                            {': '}
                            {translate('screens/kyc', 'Set up the 2FA authenticator')}
                          </h2>
                          <QRCode
                            className="mx-auto h-auto w-full max-w-[15rem]"
                            value={setupInfo.uri}
                            size={128}
                            fgColor={'#072440'}
                          />
                          <StyledVerticalStack full center>
                            <p className="text-dfxGray-800 italic">{translate('screens/kyc', 'Secret')}:</p>
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
                          <>
                            {translate('screens/kyc', 'Step {{step}}', { step: 3 })}
                            {': '}
                          </>
                        )}
                        {translate('screens/kyc', 'Enter the 6-digit dynamic code from your authenticator app')}
                      </h2>
                      {setupInfo && (
                        <p className="text-dfxGray-700">
                          {translate(
                            'screens/kyc',
                            'Click + in Google Authenticator to add a new account. You can scan the QR code or enter the secret provided to create your account in Google Authenticator.',
                          )}
                        </p>
                      )}
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

                      <StyledVerticalStack gap={2} full center>
                        <StyledButton
                          type="submit"
                          width={StyledButtonWidth.MIN}
                          label={translate('general/actions', 'Next')}
                          onClick={handleSubmit(onSubmit)}
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
          </div>
        </Form>
      )}
    </Layout>
  );
}
