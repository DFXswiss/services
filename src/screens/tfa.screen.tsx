import { ApiError, TfaSetup, Utils, Validations, useKyc, useUserContext } from '@dfx.swiss/react';
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
import { TfaLevel, TfaType } from '@dfx.swiss/react/dist/definitions/kyc';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from '../components/error-hint';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';
import { useClipboard } from '../hooks/clipboard.hook';
import { Tile } from '../hooks/feature-tree.hook';
import { useUserGuard } from '../hooks/guard.hook';
import { useNavigation } from '../hooks/navigation.hook';
import { useResizeObserver } from '../hooks/resize-observer.hook'; // Adjust the import path as necessary

const choiceTiles: Tile[] = [
  {
    id: 'choice1',
    img: '/authenticator-app-icon.webp', // Path to the authenticator app icon
    next: { page: 'choice1Page', tiles: [] }, // Adjust as necessary
  },
  {
    id: 'choice2',
    img: '/passkey-icon.webp', // Path to the passkey icon
    next: { page: 'choice2Page', tiles: [] }, // Adjust as necessary
  },
];

function TileComponent({ tile, onClick }: { tile: Tile; onClick: (t: Tile) => void }): JSX.Element {
  const { translate } = useSettingsContext();
  const tileRef = useResizeObserver<HTMLDivElement>((el) => setSize(el.offsetHeight));

  const [size, setSize] = useState<number>();

  return (
    <div
      ref={tileRef}
      className="relative aspect-square overflow-hidden"
      style={{ borderRadius: '4%', boxShadow: '0px 0px 5px 3px rgba(0, 0, 0, 0.25)' }}
      onClick={() => onClick(tile)}
    >
      <img src={tile.img} className={tile.disabled ? 'opacity-60' : 'cursor-pointer'} />
      {tile.disabled && (
        <div
          className="absolute right-2 bottom-3 text-dfxBlue-800 font-extrabold rotate-180 uppercase"
          style={{ writingMode: 'vertical-rl', fontSize: `${(size ?? 0) / 20}px` }}
        >
          {translate('screens/home', 'Coming Soon')}
        </div>
      )}
    </div>
  );
}

export default function TfaScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { user } = useUserContext();
  const { setup2fa, verify2fa, setupPasskey, verifyPasskey } = useKyc();
  const { search, state } = useLocation();
  const { copy } = useClipboard();
  const { goBack } = useNavigation();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false); // New state variable

  const [setupInfo, setSetupInfo] = useState<TfaSetup>();

  const params = new URLSearchParams(search);
  const kycCode = params.get('code') ?? user?.kyc.hash;
  const tfaLevel: TfaLevel | undefined = state?.level;

  const handleChoice = (choice: string) => {
    if (setupInfo) {
      console.log('handle choice', choice);
      const newSetupInfo = { ...setupInfo }; // Create a new object to avoid direct mutation
      if (choice === 'choice2') {
        newSetupInfo.type = TfaType.PASSKEY;
        setSetupInfo(newSetupInfo); // Update the state
        setIsFirstSetup(true); // Set the flag to true
        initiatePasskeyLogin(true);
      } else {
        newSetupInfo.type = TfaType.APP;
        setSetupInfo(newSetupInfo); // Update the state
      }
    }
  };

  const initiatePasskeyLogin = async (isFirstSetup: boolean) => {
    try {
      console.log('initiate PasskeyLogin', user?.kyc.hash);
      const userHash = user?.kyc.hash || '';

      console.log('setupInfo', setupInfo);
      console.log('isFirstSetup', isFirstSetup);

      if (!setupInfo) {
        return;
      }

      const uuidToUint8Array = (uuid: string) => {
        return new Uint8Array(
          uuid
            .split('-')
            .join('')
            .match(/.{1,2}/g)!
            .map((byte) => parseInt(byte, 16)),
        );
      };

      if (isFirstSetup) {
        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
          challenge: Uint8Array.from(atob(setupInfo.secret), (c) => c.charCodeAt(0)), // Decode the base64 challenge
          rp: {
            name: 'dfx', // Replace with your RP name
          },
          user: {
            id: uuidToUint8Array(userHash),
            name: user?.mail ?? '', // Replace with the actual user name
            displayName: user?.accountId.toString() ?? '', // Replace with the actual display name
          },
          pubKeyCredParams: [
            {
              type: 'public-key',
              alg: -7, // ES256 algorithm
            },
          ],
          timeout: 60000,
          attestation: 'direct',
        };

        console.log('create');

        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        });

        if (credential) {
          console.log('Passkey creation successful:', credential);

          // Extract the necessary information from the credential
          const { id, rawId, response } = credential as PublicKeyCredential;
          const { attestationObject, clientDataJSON } = response as AuthenticatorAttestationResponse;

          // Convert rawId and response to base64 or base64url format
          const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(rawId)));
          const attestationObjectBase64 = btoa(String.fromCharCode(...new Uint8Array(attestationObject)));
          const clientDataJSONBase64 = btoa(String.fromCharCode(...new Uint8Array(clientDataJSON)));

          // Send the extracted information to your server for storage and verification
          setupPasskey({
            id,
            rawId: rawIdBase64,
            attestationObject: attestationObjectBase64,
            clientDataJSON: clientDataJSONBase64,
          })
            .then(() => {
              console.log('Credential saved and verified by server');
            })
            .catch((error: ApiError) => {
              console.error('Credential verification failed', error);
              setError(error.message ?? 'Unknown error');
            });
        }
      } else {
        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
          challenge: Uint8Array.from(atob(setupInfo.secret), (c) => c.charCodeAt(0)), // Decode the base64 challenge
          allowCredentials: [
            {
              id: uuidToUint8Array(userHash),
              type: 'public-key',
            },
          ],
          timeout: 60000,
          userVerification: 'preferred',
        };

        const credential = await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
        });

        if (credential) {
          console.log('Passkey login successful:', credential);

          // Extract the necessary information from the credential
          const { id, rawId, response } = credential as PublicKeyCredential;
          const { authenticatorData, clientDataJSON, signature, userHandle } = response as AuthenticatorAssertionResponse;

          // Convert rawId and response to base64 or base64url format
          const rawIdBase64 = btoa(String.fromCharCode(...new Uint8Array(rawId)));
          const authenticatorDataBase64 = btoa(String.fromCharCode(...new Uint8Array(authenticatorData)));
          const clientDataJSONBase64 = btoa(String.fromCharCode(...new Uint8Array(clientDataJSON)));
          const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
          const userHandleBase64 = userHandle ? btoa(String.fromCharCode(...new Uint8Array(userHandle))) : null;

          // Send the extracted information to your server for verification
          verifyPasskey({
            id,
            rawId: rawIdBase64,
            authenticatorData: authenticatorDataBase64,
            clientDataJSON: clientDataJSONBase64,
            signature: signatureBase64,
            userHandle: userHandleBase64,
          })
            .then(() => {
              console.log('Credential verified by server');
            })
            .catch((error: ApiError) => {
              console.error('Credential verification failed', error);
              setError(error.message ?? 'Unknown error');
            });
        }
      }
    } catch (error) {
      console.error('Passkey login failed:', error);
      setError('Passkey login failed');
    }
  };

  useUserGuard('/login', !kycCode);

  useEffect(() => {
    load();
  }, [kycCode]);

  useEffect(() => {
    console.log('setupInfo', setupInfo);
    if (setupInfo && setupInfo.type === TfaType.PASSKEY && !isFirstSetup) {
      initiatePasskeyLogin(false);
    }
  }, [setupInfo]);

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

    console.log('kycCode', kycCode);

    return setup2fa(kycCode, tfaLevel)
      .then(setSetupInfo)
      .catch((error: ApiError) => {
        // Do we need to handle this error?
      })
      .finally(() => setIsLoading(false));
  }

  async function onSubmit(data: { token: string }) {
    if (!kycCode) return;

    setError(undefined);
    setTokenInvalid(false);
    setIsSubmitting(true);

    verify2fa(kycCode, data.token)
      .then(() => goBack())
      .catch((e: ApiError) => (e.statusCode === 403 ? setTokenInvalid(true) : setError(e.message ?? 'Unknown error')))
      .finally(() => setIsSubmitting(false));
  }

  function openAppStore(url: string) {
    window.open(url, '_blank', 'noreferrer');
  }

  return (
    <Layout title={translate('screens/2fa', '2FA')}>
      {isLoading ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : setupInfo?.type === TfaType.UNDEFINED ? (
        <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
          {choiceTiles.map((tile) => (
            <TileComponent key={tile.id} tile={tile} onClick={() => handleChoice(tile.id)} />
          ))}
        </div>
      ) : (
        (setupInfo?.type === TfaType.MAIL || setupInfo?.type === TfaType.APP) && (
          <Form
            control={control}
            rules={rules}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            translate={translateError}
          >
            <div className="text-left">
              <StyledVerticalStack gap={10} full>
                <>
                  {setupInfo?.uri && (
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

                  <StyledVerticalStack gap={4} full>
                    <h2 className="text-dfxGray-700">
                      {/* step 3 */}
                      {setupInfo?.uri && (
                        <span className="text-dfxGray-800">
                          {translate('screens/2fa', 'Step {{step}}', { step: 3 })}
                          {': '}
                        </span>
                      )}
                      <span className="font-medium">
                        {translate(
                          'screens/2fa',
                          setupInfo?.type === TfaType.MAIL
                            ? 'We have emailed you a 6-digit code. Please enter it here.'
                            : 'Enter the 6-digit dynamic code from your authenticator app',
                        )}
                      </span>
                    </h2>
                    <StyledInput
                      name="token"
                      type="number"
                      placeholder={translate(
                        'screens/2fa',
                        setupInfo?.type === TfaType.MAIL ? 'Email code' : 'Authenticator code',
                      )}
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
                {error && (
                  <StyledVerticalStack full center>
                    <ErrorHint message={error} />
                  </StyledVerticalStack>
                )}
              </StyledVerticalStack>
            </div>
          </Form>
        )
      )}
    </Layout>
  );
}