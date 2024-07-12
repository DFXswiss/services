import { Fiat, Language, useBuy, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  DfxIcon,
  Form,
  IconColor,
  IconVariant,
  StyledButton,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { blankedAddress } from 'src/util/utils';

interface FormData {
  language: Language;
  currency: Fiat;
}

export function SettingsScreen(): JSX.Element {
  const { translate, language, availableLanguages, changeLanguage } = useSettingsContext();
  const { user } = useUserContext();
  const { currencies } = useBuy();
  const rootRef = useRef<HTMLDivElement>(null);

  const [showWarning, setShowWarning] = useState(false);
  const [showMenu, setShowMenu] = useState<string>();

  const {
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>();
  const selectedLanguage = useWatch({ control, name: 'language' });
  const selectedCurrency = useWatch({ control, name: 'currency' });

  useEffect(() => {
    if (language && !selectedLanguage) setValue('language', language);
  }, [language]);

  useEffect(() => {
    if (currencies && !selectedCurrency) setValue('currency', currencies[0]);
  }, [currencies]);

  useEffect(() => {
    if (selectedLanguage?.id !== language?.id) {
      changeLanguage(selectedLanguage);
    }
  }, [selectedLanguage]);

  function onCloseWarning(confirm: boolean) {
    setShowWarning(false);
    if (confirm) window.open('https://t.me/DFXswiss' + (language?.symbol === 'DE' ? '' : '_en'), '_blank');
  }

  function toggleMenu(address: string) {
    if (showMenu === address) {
      setShowMenu(undefined);
    } else {
      setShowMenu(address);
    }
  }

  return (
    <Layout title="Settings" rootRef={rootRef} onBack={showWarning ? () => setShowWarning(false) : undefined}>
      <StyledVerticalStack full gap={8}>
        <StyledVerticalStack full gap={2}>
          <div className="text-sm text-dfxBlue-700 font-semibold">General</div>
          <Form control={control} errors={errors}>
            <StyledDropdown
              name="language"
              label=""
              placeholder={translate('general/actions', 'Select...')}
              items={Object.values(availableLanguages)}
              labelFunc={(item) => item.name}
              descriptionFunc={(item) => item.foreignName}
            />
          </Form>

          <Form control={control} errors={errors}>
            <StyledDropdown
              name="currency"
              label=""
              placeholder={translate('general/actions', 'Select...')}
              items={Object.values(currencies || [])}
              labelFunc={(item) => item.name}
            />
          </Form>
        </StyledVerticalStack>

        <StyledVerticalStack full>
          <StyledDataTable label="Your Wallets" alignContent={AlignContent.BETWEEN}>
            {user?.addresses.map((address) => (
              <StyledDataTableRow key={address.address}>
                <div className="flex flex-col items-start gap-1">
                  <div className="flex flex-row gap-2 font-semibold">
                    {address.wallet}
                    {address.address === user.activeAddress?.address && (
                      <div className="flex bg-dfxGray-400 font-bold rounded-sm px-1.5 text-2xs items-center justify-center">
                        CONNECTED
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-dfxGray-700">{blankedAddress(address.address, 30)}</div>
                </div>
                <div className="relative flex items-center">
                  <button onClick={() => toggleMenu(address.address)}>
                    <DfxIcon icon={IconVariant.THREE_DOTS_VERT} color={IconColor.BLUE} />
                  </button>
                  {showMenu === address.address && (
                    <div className="absolute right-5 top-3 border border-dfxGray-400 shadow-md shadow-dfxGray-400 z-10 bg-white rounded-md">
                      <div className="flex flex-col divide-y-0.5 divide-dfxGray-400 items-start bg-dfxGray-100 w-32">
                        <button
                          className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                          onClick={() => console.log('copy address')}
                        >
                          Copy
                        </button>
                        <button
                          className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                          onClick={() => console.log('open explorer')}
                        >
                          Explorer
                        </button>
                        <button
                          className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                          onClick={() => console.log('rename address')}
                        >
                          Rename
                        </button>
                        <button
                          className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                          onClick={() => console.log('delete address')}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </StyledDataTableRow>
            ))}
          </StyledDataTable>
        </StyledVerticalStack>
        <StyledVerticalStack full gap={2}>
          <StyledButton
            label={translate('general/actions', 'Delete Account')}
            onClick={() => console.log('delete account')}
          />
          <div className="text-sm leading-5 text-dfxGray-700">
            Deleting your account is an irreversible action. Your data will remain on our servers for a period of time
            before being permanently deleted. If you have any questions, please contact our support.
          </div>
        </StyledVerticalStack>
      </StyledVerticalStack>
    </Layout>
  );
}
