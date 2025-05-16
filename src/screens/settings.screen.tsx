import { Fiat, Language, useFiatContext, UserAddress, useUserContext, Validations } from '@dfx.swiss/react';
import {
  AlignContent,
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Trans } from 'react-i18next';
import ActionableList from 'src/components/actionable-list';
import { Layout } from 'src/components/layout';
import { ConfirmationOverlay, EditOverlay } from 'src/components/overlays';
import { addressLabel } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress, sortAddressesByBlockchain } from 'src/util/utils';

interface FormData {
  language: Language;
  currency: Fiat;
}

enum OverlayType {
  NONE,
  DELETE_ADDRESS,
  DELETE_ACCOUNT,
  RENAME_ADDRESS,
  EDIT_EMAIL,
  EDIT_PHONE,
}

const OverlayHeader: { [key in OverlayType]: string } = {
  [OverlayType.NONE]: '',
  [OverlayType.DELETE_ADDRESS]: 'Delete address',
  [OverlayType.DELETE_ACCOUNT]: 'Delete account',
  [OverlayType.RENAME_ADDRESS]: 'Rename address',
  [OverlayType.EDIT_EMAIL]: 'Edit email',
  [OverlayType.EDIT_PHONE]: 'Edit phone number',
};

export default function SettingsScreen(): JSX.Element {
  const { translate, language, currency, availableLanguages, changeLanguage, changeCurrency } = useSettingsContext();
  const { currencies } = useFiatContext();
  const { user, isUserLoading } = useUserContext();
  const { navigate } = useNavigation();
  const { width } = useWindowContext();

  const rootRef = useRef<HTMLDivElement>(null);

  const [menuAddress, setMenuAddress] = useState<UserAddress>();
  const [showDisabledWallets, setShowDisabledWallets] = useState(false);
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
    if (overlayType === OverlayType.EDIT_EMAIL) navigate('/settings/mail', { setRedirect: true });
  }, [overlayType]);

  function onCloseOverlay(): void {
    setOverlayType(OverlayType.NONE);
    setMenuAddress(undefined);
  }

  const title = OverlayHeader[overlayType]
    ? `${translate('general/actions', OverlayHeader[overlayType])}?`
    : translate('screens/settings', 'Settings');

  const userAddresses = user?.addresses.sort(sortAddressesByBlockchain);
  const disabledAddresses = showDisabledWallets ? user?.disabledAddresses.sort(sortAddressesByBlockchain) : [];
  const addressesList = (userAddresses ?? []).concat(disabledAddresses ?? []);

  return (
    <Layout title={title} rootRef={rootRef} onBack={overlayType ? () => onCloseOverlay() : undefined}>
      {overlayType ? (
        <SettingsOverlay type={overlayType} address={menuAddress} onClose={onCloseOverlay} />
      ) : (
        <StyledVerticalStack full gap={8}>
          <StyledVerticalStack full gap={4}>
            <Form control={control} errors={errors}>
              <StyledDropdown
                name="language"
                label={translate('screens/settings', 'Language')}
                smallLabel={true}
                placeholder={translate('general/actions', 'Select') + '...'}
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
                placeholder={translate('general/actions', 'Select') + '...'}
                items={currencies ?? []}
                labelFunc={(item) => item.name}
              />
            </Form>
          </StyledVerticalStack>

          {!!(user?.mail || user?.phone) && (
            <StyledVerticalStack full gap={2}>
              <StyledDataTable
                label={translate('screens/kyc', 'Personal Information')}
                alignContent={AlignContent.BETWEEN}
              >
                {user?.mail && (
                  <StyledDataTableRow>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex flex-row gap-2 font-semibold">
                        {translate('screens/kyc', 'Email address')}
                      </div>
                      <div className="text-xs text-dfxGray-700">{user?.mail}</div>
                    </div>
                    <div className="relative flex items-center">
                      <button onClick={() => setOverlayType(OverlayType.EDIT_EMAIL)}>
                        <DfxIcon icon={IconVariant.EDIT} size={IconSize.SM} color={IconColor.BLACK} />
                      </button>
                    </div>
                  </StyledDataTableRow>
                )}
                {user?.phone && (
                  <StyledDataTableRow>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex flex-row gap-2 font-semibold">
                        {translate('screens/kyc', 'Phone number')}
                      </div>
                      <div className="text-xs text-dfxGray-700">{user?.phone}</div>
                    </div>
                    <div className="relative flex items-center">
                      <button onClick={() => setOverlayType(OverlayType.EDIT_PHONE)}>
                        <DfxIcon icon={IconVariant.EDIT} size={IconSize.SM} color={IconColor.BLACK} />
                      </button>
                    </div>
                  </StyledDataTableRow>
                )}
              </StyledDataTable>
            </StyledVerticalStack>
          )}

          {isUserLoading ? (
            <div className="flex mt-4 w-full justify-center items-center">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            <ActionableList
              label={translate('screens/settings', 'Your Addresses')}
              hideItemsText={translate('screens/settings', 'Hide deleted addresses')}
              showItemsText={translate('screens/settings', 'Show deleted addresses')}
              items={addressesList.map((address) => {
                const isDisabled = user?.disabledAddresses.some((d) => d.address === address.address) ?? false;

                return {
                  key: address.address,
                  label: address.label ?? address.wallet,
                  subLabel: blankedAddress(address.address, { width }),
                  isDisabled,
                  tag:
                    address.address === user?.activeAddress?.address
                      ? translate('screens/settings', 'Active').toUpperCase()
                      : undefined,
                  menuItems: [
                    {
                      label: translate('general/actions', 'Copy'),
                      onClick: () => copy(address.address),
                      closeOnClick: true,
                    },
                    {
                      label: translate('general/actions', 'Open Explorer'),
                      onClick: () => window.open(address.explorerUrl, '_blank'),
                      closeOnClick: true,
                    },
                    {
                      label: translate('general/actions', 'Rename'),
                      onClick: () => setOverlayType(OverlayType.RENAME_ADDRESS),
                      hidden: isDisabled,
                    },
                    {
                      label: translate('general/actions', 'Delete'),
                      onClick: () => setOverlayType(OverlayType.DELETE_ADDRESS),
                      hidden: isDisabled,
                    },
                  ],
                };
              })}
              buttonLabel={translate('general/actions', 'Delete account')}
              buttonAction={() => setOverlayType(OverlayType.DELETE_ACCOUNT)}
            />
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

interface SettingsOverlayProps {
  type: OverlayType;
  address?: UserAddress;
  onClose: () => void;
}

function SettingsOverlay({ type, address, onClose }: SettingsOverlayProps): JSX.Element {
  const { user } = useUserContext();
  const { width } = useWindowContext();
  const { translate } = useSettingsContext();
  const { setWallet } = useWalletContext();
  const { deleteAddress, deleteAccount, renameAddress, updatePhone } = useUserContext();

  switch (type) {
    case OverlayType.DELETE_ADDRESS:
      const formattedAddress = blankedAddress(address ? addressLabel(address) : '', { width });

      return (
        <ConfirmationOverlay
          messageContent={
            <p className="text-dfxBlue-800 mb-2">
              <Trans i18nKey="screens/settings.delete" values={{ address: formattedAddress }}>
                Are you sure you want to delete the address <strong>{formattedAddress}</strong> from your DFX account?
                This action is irreversible.
              </Trans>
            </p>
          }
          cancelLabel={translate('general/actions', 'Cancel')}
          confirmLabel={translate('general/actions', 'Delete')}
          onCancel={onClose}
          onConfirm={async () => {
            if (address) {
              await deleteAddress(address.address);
              address.address === user?.activeAddress?.address && setWallet();
            }
            onClose();
          }}
        />
      );
    case OverlayType.DELETE_ACCOUNT:
      return (
        <ConfirmationOverlay
          message={translate(
            'screens/settings',
            'Your data will remain on our servers temporarily before permanent deletion. If you have any questions, please contact our support team.',
          )}
          cancelLabel={translate('general/actions', 'Cancel')}
          confirmLabel={translate('general/actions', 'Delete')}
          onCancel={onClose}
          onConfirm={async () => {
            await deleteAccount();
            setWallet();
            onClose();
          }}
        />
      );
    case OverlayType.RENAME_ADDRESS:
      return (
        <EditOverlay
          label={translate('screens/settings', 'Address name')}
          autocomplete="address-label"
          prefill={address?.label ?? address?.wallet}
          placeholder={translate('screens/settings', 'Address name')}
          onCancel={onClose}
          onEdit={async (result) => {
            if (address) await renameAddress(address.address, result);
            onClose();
          }}
        />
      );
    case OverlayType.EDIT_PHONE:
      return (
        <EditOverlay
          label={translate('screens/kyc', 'Phone number')}
          autocomplete="phone"
          prefill={user?.phone}
          placeholder={translate('screens/kyc', 'Phone number')}
          validation={Validations.Phone}
          onCancel={onClose}
          onEdit={async (result) => {
            await updatePhone(result);
            onClose();
          }}
        />
      );
    default:
      return <></>;
  }
}
