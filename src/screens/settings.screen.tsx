import {
  BankAccount,
  Fiat,
  Language,
  useBankAccountContext,
  useFiatContext,
  UserAddress,
  useUserContext,
  Utils,
  Validations,
} from '@dfx.swiss/react';
import {
  AlignContent,
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
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
import { ConfirmationOverlay } from 'src/components/overlay/confirmation-overlay';
import { EditBankAccount } from 'src/components/overlay/edit-bank-overlay';
import { EditOverlay } from 'src/components/overlay/edit-overlay';
import { AddBankAccount } from 'src/components/payment/add-bank-account';
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
  EDIT_BANK_ACCOUNT,
  ADD_BANK_ACCOUNT,
  DELETE_BANK_ACCOUNT,
}

const OverlayHeader: { [key in OverlayType]: string } = {
  [OverlayType.NONE]: '',
  [OverlayType.DELETE_ADDRESS]: 'Delete address',
  [OverlayType.DELETE_ACCOUNT]: 'Delete account',
  [OverlayType.RENAME_ADDRESS]: 'Rename address',
  [OverlayType.EDIT_EMAIL]: 'Edit email',
  [OverlayType.EDIT_PHONE]: 'Edit phone number',
  [OverlayType.EDIT_BANK_ACCOUNT]: 'Edit bank account',
  [OverlayType.ADD_BANK_ACCOUNT]: 'Add bank account',
  [OverlayType.DELETE_BANK_ACCOUNT]: 'Delete bank account',
};

export default function SettingsScreen(): JSX.Element {
  const { translate, language, currency, availableLanguages, changeLanguage, changeCurrency } = useSettingsContext();
  const { currencies } = useFiatContext();
  const { user, isUserLoading } = useUserContext();
  const { width } = useWindowContext();
  const { navigate } = useNavigation();
  const { bankAccounts, updateAccount, isLoading: isLoadingBankAccounts } = useBankAccountContext();

  const rootRef = useRef<HTMLDivElement>(null);

  const [overlayData, setOverlayData] = useState<UserAddress | BankAccount>();
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
    setOverlayData(undefined);
  }

  const title = OverlayHeader[overlayType]
    ? `${translate('general/actions', OverlayHeader[overlayType])}?`
    : translate('screens/settings', 'Settings');

  const userAddresses = user?.addresses.sort(sortAddressesByBlockchain);
  const disabledAddresses = user?.disabledAddresses.sort(sortAddressesByBlockchain);
  const addressesList = (userAddresses ?? []).concat(disabledAddresses ?? []);

  return (
    <Layout title={title} rootRef={rootRef} onBack={overlayType ? () => onCloseOverlay() : undefined}>
      {overlayType ? (
        <SettingsOverlay type={overlayType} data={overlayData} onClose={onCloseOverlay} />
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
              <h1 className="text-dfxGray-800 font-semibold text-base flex justify-center">
                {translate('screens/kyc', 'Contact Information')}
              </h1>
              <StyledDataTable alignContent={AlignContent.BETWEEN}>
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

          {isLoadingBankAccounts ? (
            <div className="flex mt-4 w-full justify-center items-center">
              <StyledLoadingSpinner size={SpinnerSize.LG} />
            </div>
          ) : (
            bankAccounts && (
              <StyledVerticalStack full gap={2}>
                <ActionableList
                  label={translate('screens/iban', 'Bank Accounts')}
                  addButtonOnClick={() => setOverlayType(OverlayType.ADD_BANK_ACCOUNT)}
                  items={bankAccounts.map((account) => {
                    return {
                      key: account.id,
                      label: account.label ?? `${account.iban.slice(0, 2)} ${account.iban.slice(-4)}`,
                      subLabel: blankedAddress(Utils.formatIban(account.iban) ?? account.iban, { width }),
                      tag: account.default ? translate('screens/settings', 'Default').toUpperCase() : undefined,
                      menuItems: [
                        {
                          label: translate('general/actions', 'Copy'),
                          onClick: () => copy(account.iban),
                          closeOnClick: true,
                        },
                        {
                          label: translate('general/actions', 'Edit'),
                          onClick: () => {
                            setOverlayData(account);
                            setOverlayType(OverlayType.EDIT_BANK_ACCOUNT);
                          },
                        },
                        {
                          label: translate('general/actions', 'Delete'),
                          // onClick: () => updateAccount(account.id, { active: false }),
                          onClick: () => {
                            setOverlayData(account);
                            setOverlayType(OverlayType.DELETE_BANK_ACCOUNT);
                          },
                          closeOnClick: true,
                        },
                      ].concat(
                        !account.default
                          ? {
                              label: translate('general/actions', 'Set default'),
                              onClick: () => updateAccount(account.id, { default: true }),
                              closeOnClick: true,
                            }
                          : [],
                      ),
                    };
                  })}
                />
              </StyledVerticalStack>
            )
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
              addButtonOnClick={() => navigate('/connect')}
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
                      onClick: () => {
                        setOverlayData(address);
                        setOverlayType(OverlayType.RENAME_ADDRESS);
                      },
                      hidden: isDisabled,
                    },
                    {
                      label: translate('general/actions', 'Delete'),
                      onClick: () => {
                        setOverlayData(address);
                        setOverlayType(OverlayType.DELETE_ADDRESS);
                      },
                      hidden: isDisabled,
                    },
                  ],
                };
              })}
            />
          )}
          <StyledButton
            width={StyledButtonWidth.FULL}
            label={translate('general/actions', 'Delete account')}
            onClick={() => setOverlayType(OverlayType.DELETE_ACCOUNT)}
          />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

interface SettingsOverlayProps {
  type: OverlayType;
  data?: UserAddress | BankAccount;
  onClose: () => void;
}

function SettingsOverlay({ type, data, onClose }: SettingsOverlayProps): JSX.Element {
  const { user } = useUserContext();
  const { width } = useWindowContext();
  const { translate } = useSettingsContext();
  const { setWallet } = useWalletContext();
  const { deleteAddress, deleteAccount, renameAddress, updatePhone } = useUserContext();
  const { bankAccounts, updateAccount, isLoading: isLoadingBankAccounts } = useBankAccountContext();

  switch (type) {
    case OverlayType.DELETE_ADDRESS:
      const formattedAddress = blankedAddress(data ? addressLabel(data as UserAddress) : '', { width });

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
            if (data) {
              const userAddress = data as UserAddress;
              await deleteAddress(userAddress.address);
              userAddress.address === user?.activeAddress?.address && setWallet();
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
      const userAddress = data as UserAddress;
      return (
        <EditOverlay
          label={translate('screens/settings', 'Address name')}
          autocomplete="address-label"
          prefill={userAddress?.label ?? userAddress?.wallet}
          placeholder={translate('screens/settings', 'Address name')}
          onCancel={onClose}
          onEdit={async (result) => {
            if (userAddress) await renameAddress(userAddress.address, result);
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
    case OverlayType.EDIT_BANK_ACCOUNT:
      return <EditBankAccount bankAccount={data as BankAccount} onClose={onClose} />;
    case OverlayType.ADD_BANK_ACCOUNT:
      return (
        <AddBankAccount
          onSubmit={(_) => onClose()}
          confirmationText={translate(
            'screens/iban',
            'The bank account has been added, all transactions from this IBAN will now be associated with your account.',
          )}
        />
      );
    case OverlayType.DELETE_BANK_ACCOUNT:
      const bankAccount = data as BankAccount;
      const formattedBankAccount = blankedAddress(Utils.formatIban(bankAccount.iban) ?? bankAccount.iban, { width });

      return (
        <ConfirmationOverlay
          messageContent={
            <p className="text-dfxBlue-800 mb-2">
              <Trans i18nKey="screens/settings.delete_iban" values={{ address: formattedBankAccount }}>
                Are you sure you want to delete the bank account <strong>{formattedBankAccount}</strong> from your DFX
                account?
              </Trans>
            </p>
          }
          cancelLabel={translate('general/actions', 'Cancel')}
          confirmLabel={translate('general/actions', 'Delete')}
          onCancel={onClose}
          onConfirm={async () => {
            await updateAccount(bankAccount.id, { active: false });
            onClose();
          }}
        />
      );
    default:
      return <></>;
  }
}
