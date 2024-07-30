import { Fiat, Language, useFiatContext, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  DfxIcon,
  Form,
  IconColor,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { OverlayContent, OverlayHeader, OverlayType } from 'src/components/home/settings-overlays';
import { Layout } from 'src/components/layout';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useClipboard } from 'src/hooks/clipboard.hook';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useStore } from 'src/hooks/store.hook';
import { blankedAddress, sortAddressesByBlockchain } from 'src/util/utils';

interface FormData {
  language: Language;
  currency: Fiat;
}

export default function SettingsScreen(): JSX.Element {
  const { translate, language, currency, availableLanguages, changeLanguage, changeCurrency } = useSettingsContext();
  const { currencies } = useFiatContext();
  const { user, isUserLoading } = useUserContext();
  const { copy } = useClipboard();
  const { activeWallet } = useStore();
  const { width } = useWindowContext();
  const { deleteAddress, deleteAccount, renameAddress } = useUserContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [menuAddress, setMenuAddress] = useState<string>();
  const [overlayType, setOverlayType] = useState<OverlayType>(OverlayType.NONE);

  useUserGuard('/login');

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
    if (currency && !selectedCurrency) setValue('currency', currency);
  }, [currency]);

  useEffect(() => {
    if (selectedLanguage && selectedLanguage?.id !== language?.id) {
      changeLanguage(selectedLanguage);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    if (selectedCurrency && selectedCurrency?.id !== currency?.id) {
      changeCurrency(selectedCurrency);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    const element = rootRef?.current ?? document;
    if (element) {
      function closeMenu(event: Event) {
        if (menuAddress && !overlayType && !menuRef.current?.contains(event.target as Node)) {
          toggleMenuAddress();
        }
      }

      element.addEventListener('mousedown', closeMenu);
      return () => element.removeEventListener('mousedown', closeMenu);
    }
  }, [menuAddress, overlayType, rootRef, menuRef]);

  function toggleMenuAddress(address?: string) {
    setMenuAddress((menuAddress) => (menuAddress !== address ? address : undefined));
  }

  async function onCloseOverlay(result?: any): Promise<void> {
    if (result) {
      switch (overlayType) {
        case OverlayType.DELETE_ADDRESS:
          if (!menuAddress) break;
          deleteAddress(menuAddress);
          menuAddress === user?.activeAddress?.address && activeWallet.remove();
          break;
        case OverlayType.RENAME_ADDRESS:
          if (!menuAddress) break;
          await renameAddress(menuAddress, result);
          break;
        case OverlayType.DELETE_ACCOUNT:
          deleteAccount();
          activeWallet.remove();
          break;
      }
    }
    setOverlayType(OverlayType.NONE);
    toggleMenuAddress();
  }

  const title = OverlayHeader[overlayType]
    ? `${translate('general/actions', OverlayHeader[overlayType])}?`
    : translate('screens/settings', 'Settings');

  return (
    <Layout title={title} rootRef={rootRef} onBack={overlayType ? () => onCloseOverlay() : undefined}>
      {overlayType ? (
        <OverlayContent type={overlayType} onClose={onCloseOverlay} address={menuAddress} />
      ) : (
        <StyledVerticalStack full gap={8}>
          <StyledVerticalStack full gap={4}>
            <Form control={control} errors={errors}>
              <StyledDropdown
                name="language"
                label={translate('screens/settings', 'Language')}
                smallLabel={true}
                placeholder={translate('general/actions', 'Select...')}
                items={availableLanguages}
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
                items={currencies ?? []}
                labelFunc={(item) => item.name}
              />
            </Form>
          </StyledVerticalStack>

          {isUserLoading ? (
            <div className="flex mt-4 w-full justify-center items-center">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            <>
              {user?.addresses.length ? (
                <StyledVerticalStack full gap={2}>
                  <StyledDataTable
                    label={translate('screens/settings', 'Your Wallets')}
                    alignContent={AlignContent.BETWEEN}
                  >
                    {user.addresses.sort(sortAddressesByBlockchain).map((address) => (
                      <StyledDataTableRow key={address.address}>
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex flex-row gap-2 font-semibold">
                            {address.label ?? address.wallet}
                            {address.address === user.activeAddress?.address && (
                              <div className="flex bg-dfxGray-400 font-bold rounded-sm px-1.5 text-2xs items-center justify-center">
                                {translate('screens/settings', 'Active').toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-dfxGray-700">{blankedAddress(address.address, { width })}</div>
                        </div>
                        <div className="relative flex items-center">
                          <button onClick={() => toggleMenuAddress(address.address)}>
                            <DfxIcon icon={IconVariant.THREE_DOTS_VERT} color={IconColor.BLUE} />
                          </button>
                          {menuAddress === address.address && (
                            <div
                              ref={menuRef}
                              className="absolute right-5 top-3 border border-dfxGray-400 shadow-md z-10 bg-white rounded-md overflow-clip"
                            >
                              <div className="flex flex-col divide-y-0.5 divide-dfxGray-400 items-start bg-dfxGray-100 w-36">
                                <button
                                  className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                                  onClick={() => {
                                    copy(address.address);
                                    toggleMenuAddress();
                                  }}
                                >
                                  {translate('general/actions', 'Copy')}
                                </button>
                                {address.explorerUrl && (
                                  <button
                                    className="hover:bg-dfxGray-300  w-full text-left px-4 py-2"
                                    onClick={() => {
                                      window.open(address.explorerUrl, '_blank');
                                      toggleMenuAddress();
                                    }}
                                  >
                                    {translate('general/actions', 'Open Explorer')}
                                  </button>
                                )}
                                <button
                                  className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                                  onClick={() => setOverlayType(OverlayType.RENAME_ADDRESS)}
                                >
                                  {translate('general/actions', 'Rename')}
                                </button>
                                <button
                                  className="hover:bg-dfxGray-300 w-full text-left px-4 py-2"
                                  onClick={() => setOverlayType(OverlayType.DELETE_ADDRESS)}
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
                </StyledVerticalStack>
              ) : (
                <></>
              )}
              <StyledButton
                label={translate('general/actions', 'Delete account')}
                onClick={() => setOverlayType(OverlayType.DELETE_ACCOUNT)}
              />
            </>
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
