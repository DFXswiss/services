import { Fiat, Language, useApiSession, useBuy, useUser, useUserContext } from '@dfx.swiss/react';
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
import { DeleteOverlay, DeleteOverlayType } from 'src/components/home/address-delete';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useClipboard } from 'src/hooks/clipboard.hook';
import { useStore } from 'src/hooks/store.hook';
import { blankedAddress } from 'src/util/utils';

interface FormData {
  language: Language;
  currency: Fiat;
}

export function SettingsScreen(): JSX.Element {
  const { translate, language, availableLanguages, changeLanguage } = useSettingsContext();
  const { user } = useUserContext();
  const { currencies } = useBuy();
  const { copy } = useClipboard();
  const rootRef = useRef<HTMLDivElement>(null);
  const { activeWallet } = useStore();
  const { changeUserAddress, deleteUserAddress, deleteUserAccount } = useUser();
  const { updateSession, deleteSession } = useApiSession();

  const menuRef = useRef<HTMLDivElement | null>(null);

  const [showMenu, setShowMenu] = useState<string>();
  const [showDeleteOverlay, setShowDeleteOverlay] = useState<DeleteOverlayType>(DeleteOverlayType.NONE);

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
    if (selectedLanguage && selectedLanguage?.id !== language?.id) {
      changeLanguage(selectedLanguage);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setShowMenu(undefined);
      }
    }

    document.addEventListener('mousedown', handleClick);

    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuRef]);

  function toggleMenu(address: string) {
    if (showMenu === address) {
      setShowMenu(undefined);
    } else {
      setShowMenu(address);
    }
  }

  async function onDelete(response: boolean): Promise<void> {
    if (response) {
      switch (showDeleteOverlay) {
        case DeleteOverlayType.ADDRESS:
          onDeleteAddress();
          break;
        case DeleteOverlayType.ACCOUNT:
          onDeleteAccount();
          break;
      }
    }
    setShowDeleteOverlay(DeleteOverlayType.NONE);
  }

  async function onDeleteAddress(_address?: string): Promise<void> {
    // TODO: Support address parameter
    deleteUserAddress().then(() => {
      if (user!.addresses.length > 0) {
        onSwitchUser(user!.addresses[0].address);
      } else {
        deleteSession();
        activeWallet.remove();
      }
    });
  }

  async function onDeleteAccount(): Promise<void> {
    deleteUserAccount().then(() => {
      deleteSession();
      activeWallet.remove();
    });
  }

  async function onSwitchUser(address: string): Promise<void> {
    changeUserAddress(address).then(({ accessToken }) => {
      updateSession(accessToken);
      activeWallet.remove();
    });
  }

  const title =
    showDeleteOverlay === DeleteOverlayType.ADDRESS
      ? `${translate('general/actions', 'Delete Address')}?`
      : showDeleteOverlay === DeleteOverlayType.ACCOUNT
      ? `${translate('general/actions', 'Delete Account')}?`
      : translate('screens/settings', 'Settings');

  return (
    <Layout
      title={title}
      rootRef={rootRef}
      onBack={showDeleteOverlay ? () => setShowDeleteOverlay(DeleteOverlayType.NONE) : undefined}
    >
      {showDeleteOverlay ? (
        <DeleteOverlay type={showDeleteOverlay} onClose={onDelete} address={user?.activeAddress?.address} />
      ) : (
        <StyledVerticalStack full gap={8}>
          <StyledVerticalStack full gap={4}>
            <Form control={control} errors={errors}>
              <StyledDropdown
                name="language"
                label={translate('screens/settings', 'Language')}
                smallLabel={true}
                placeholder={translate('general/actions', 'Select...')}
                items={Object.values(availableLanguages)}
                labelFunc={(item) => item.name}
                descriptionFunc={(item) => item.foreignName}
              />
            </Form>

            <Form control={control} errors={errors}>
              <StyledDropdown
                name="currency"
                label={translate('screens/settings', 'Currency')}
                smallLabel={true}
                placeholder={translate('general/actions', 'Select...')}
                items={Object.values(currencies || [])}
                labelFunc={(item) => item.name}
              />
            </Form>
          </StyledVerticalStack>

          <StyledVerticalStack full gap={2}>
            <StyledDataTable label={translate('screens/settings', 'Your Wallets')} alignContent={AlignContent.BETWEEN}>
              {user?.addresses.map((address) => (
                <StyledDataTableRow key={address.address}>
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex flex-row gap-2 font-semibold">
                      {address.wallet}
                      {address.address === user.activeAddress?.address && (
                        <div className="flex bg-dfxGray-400 font-bold rounded-sm px-1.5 text-2xs items-center justify-center">
                          {translate('screens/settings', 'Active').toUpperCase()}
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
                      <div
                        ref={menuRef}
                        className="absolute right-5 top-3 border border-dfxGray-400 shadow-md z-10 bg-white rounded-md overflow-clip"
                      >
                        <div className="flex flex-col divide-y-0.5 divide-dfxGray-400 items-start bg-dfxGray-100 w-36">
                          <button
                            className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                            onClick={() => {
                              copy(address.address);
                              setShowMenu(undefined);
                            }}
                          >
                            {translate('general/actions', 'Copy')}
                          </button>
                          <button
                            className="hover:bg-dfxGray-300  w-full text-left px-4 py-2"
                            onClick={() => {
                              console.log('open explorer');
                              setShowMenu(undefined);
                            }}
                          >
                            {translate('general/actions', 'Open Explorer')}
                          </button>
                          <button
                            className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                            onClick={() => {
                              console.log('rename address');
                              setShowMenu(undefined);
                            }}
                          >
                            {translate('general/actions', 'Rename')}
                          </button>
                          <button
                            className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                            onClick={() => {
                              setShowDeleteOverlay(DeleteOverlayType.ADDRESS);
                              setShowMenu(undefined);
                            }}
                          >
                            {translate('general/actions', 'Delete')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </StyledDataTableRow>
              ))}
            </StyledDataTable>
            <StyledButton
              label={translate('general/actions', 'Delete Account')}
              onClick={() => setShowDeleteOverlay(DeleteOverlayType.ACCOUNT)}
            />
          </StyledVerticalStack>
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
