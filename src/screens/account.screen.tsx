import {
  DetailTransaction,
  Referral,
  UserAddress,
  Utils,
  useSessionContext,
  useTransaction,
  useUser,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledDropdown,
  StyledIconButton,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useWindowContext } from 'src/contexts/window.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useKycHelper } from 'src/hooks/kyc-helper.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { useStore } from 'src/hooks/store.hook';
import { blankedAddress, sortAddressesByBlockchain } from 'src/util/utils';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';

interface FormData {
  address: UserAddress;
}

export default function AccountScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { getDetailTransactions, getUnassignedTransactions } = useTransaction();
  const { limitToString, levelToString } = useKycHelper();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();
  const { user, isUserLoading } = useUserContext();
  const { activeWallet } = useStore();
  const { getRef } = useUser();
  const { width } = useWindowContext();
  const { canClose, isEmbedded } = useAppHandlingContext();
  const { isInitialized } = useWalletContext();
  const { changeAddress } = useUserContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const [transactions, setTransactions] = useState<Partial<DetailTransaction>[]>();
  const [referral, setRefferal] = useState<Referral | undefined>();

  useUserGuard('/login');

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (user?.activeAddress) {
      loadRefferal();
      setValue('address', user.activeAddress);
    }
  }, [user?.activeAddress]);

  useEffect(() => {
    if (isLoggedIn) loadTransactions();
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedAddress?.address && user?.activeAddress?.address !== selectedAddress?.address) {
      changeAddress(selectedAddress.address)
        .then(() => activeWallet.remove())
        .catch(() => {
          // ignore errors
        });
    }
  }, [selectedAddress]);

  async function loadRefferal(): Promise<void> {
    return getRef().then(setRefferal);
  }

  async function loadTransactions(): Promise<void> {
    Promise.all([getDetailTransactions(), getUnassignedTransactions()])
      .then((txs) => {
        const sorted = txs
          .flat()
          .sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : -1))
          .slice(0, 5) as DetailTransaction[];
        setTransactions(
          sorted.map((t) => ({
            id: t.id,
            inputAsset: t.inputAsset,
            inputAmount: t.inputAmount,
            outputAsset: t.outputAsset,
            outputAmount: t.outputAmount,
            date: t.date,
          })),
        );
      })
      .catch(() => {
        // ignore errors
      });
  }

  const title = isEmbedded ? translate('screens/home', 'DFX services') : translate('screens/home', 'Account');
  const hasBackButton = canClose && !isEmbedded;
  const image = 'https://content.dfx.swiss/img/v1/services/berge.jpg';

  const transactionItems = transactions?.map((t) => ({
    label: new Date(t.date as Date).toLocaleString(),
    text: `${t.inputAsset ? `${t.inputAmount ?? ''} ${t.inputAsset}` : ''} ${
      t.inputAsset && t.outputAsset ? ' → ' : ''
    } ${t.outputAsset ? `${t.outputAmount ?? ''} ${t.outputAsset}` : ''}`,
    icon: IconVariant.ARROW_RIGHT,
    onClick: () => navigate(`/tx/${t.id}`),
  }));

  const referralItems = referral?.code
    ? [
        { label: translate('screens/home', 'Volume'), text: Utils.formatAmount(referral.volume) + ' EUR' },
        { label: translate('screens/home', 'Credit'), text: Utils.formatAmount(referral.credit) + ' EUR' },
        {
          label: translate('screens/home', 'Paid credit'),
          text: Utils.formatAmount(referral.paidCredit) + ' EUR',
        },
        { label: translate('screens/home', 'User count'), text: referral.userCount.toString() },
        { label: translate('screens/home', 'Active user count'), text: referral.activeUserCount.toString() },
      ]
    : [];

  const totalVolumeItems = user && [
    { label: translate('navigation/links', 'Buy'), value: user.volumes.buy.total },
    { label: translate('navigation/links', 'Sell'), value: user.volumes.sell.total },
    { label: translate('navigation/links', 'Swap'), value: user.volumes.swap.total },
  ];

  const annualVolumeItems = user && [
    { label: translate('navigation/links', 'Buy'), value: user.volumes.buy.annual },
    { label: translate('navigation/links', 'Sell'), value: user.volumes.sell.annual },
    { label: translate('navigation/links', 'Swap'), value: user.volumes.swap.annual },
  ];

  const totalVolumeSum = totalVolumeItems?.reduce((acc, item) => acc + item.value, 0);
  const annualVolumeSum = annualVolumeItems?.reduce((acc, item) => acc + item.value, 0);

  return (
    <Layout title={title} backButton={hasBackButton} rootRef={rootRef}>
      {!isInitialized || !isLoggedIn || isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <StyledVerticalStack gap={4} center full marginY={4} className="z-10">
          {/* Wallet Selector */}
          {user?.addresses.length ? (
            <div className="w-full bg-dfxGray-300 p-2 rounded-md">
              <div className="bg-white w-full rounded-md">
                <Form control={control} errors={errors}>
                  <StyledDropdown
                    name="address"
                    placeholder={translate('general/actions', 'Select...')}
                    items={user.addresses.sort(sortAddressesByBlockchain)}
                    disabled={user.addresses.length === 0}
                    labelFunc={(item) => blankedAddress(item.address, { width })}
                  />
                </Form>
              </div>
              <div className="flex flex-row  gap-2 w-full justify-end items-center text-dfxGray-800 text-xs pt-1.5 pr-1.5">
                <button onClick={() => copy(selectedAddress.address)} className="cursor-pointer hover:text-dfxRed-150">
                  {translate('general/actions', 'Copy Address')}
                </button>
              </div>
            </div>
          ) : (
            <></>
          )}
          {/* User Data */}
          <StyledDataTable
            label={translate('screens/home', 'Activity')}
            alignContent={AlignContent.RIGHT}
            showBorder
            minWidth={false}
          >
            <StyledDataTableExpandableRow
              label={translate('screens/home', 'Total trading volume')}
              expansionItems={
                totalVolumeItems?.map(({ label, value }) => ({ label, text: Utils.formatAmount(value) + ' CHF' })) ?? []
              }
            >
              {Utils.formatAmount(totalVolumeSum) + ' CHF'}
            </StyledDataTableExpandableRow>
            <StyledDataTableExpandableRow
              label={translate('screens/home', 'Annual trading volume')}
              expansionItems={
                annualVolumeItems?.map(({ label, value }) => ({ label, text: Utils.formatAmount(value) + ' CHF' })) ??
                []
              }
            >
              {Utils.formatAmount(annualVolumeSum) + ' CHF'}
            </StyledDataTableExpandableRow>
            {transactionItems && transactionItems.length > 0 && (
              <StyledDataTableExpandableRow
                label={translate('screens/home', 'Latest transactions')}
                expansionItems={transactionItems}
              />
            )}
          </StyledDataTable>
          {referral?.code && (
            <StyledDataTable
              label={translate('screens/home', 'Referral')}
              alignContent={AlignContent.RIGHT}
              showBorder
              minWidth={false}
            >
              <StyledDataTableRow label={translate('screens/home', 'Referral link')}>
                {referral.code}
                <CopyButton onCopy={() => copy(`${process.env.REACT_APP_REF_URL}${referral.code}`)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/home', 'Referral commission')}>
                {(referral.commission * 100).toFixed(2)}%
              </StyledDataTableRow>
              <StyledDataTableExpandableRow
                label={translate('screens/home', 'Your referral stats')}
                expansionItems={referralItems ?? []}
              />
            </StyledDataTable>
          )}
          {user && (
            <StyledDataTable
              label={translate('screens/home', 'KYC')}
              alignContent={AlignContent.RIGHT}
              showBorder
              minWidth={false}
            >
              <StyledDataTableRow label={translate('screens/home', 'Level')}>
                <p>{levelToString(user.kyc.level)}</p>
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/kyc', 'Trading limit')}>
                <div className="flex flex-row gap-1 items-center">
                  <p>{limitToString(user.tradingLimit)}</p>
                  <StyledIconButton icon={IconVariant.ARROW_UP} onClick={() => navigate('/kyc')} />
                </div>
              </StyledDataTableRow>
            </StyledDataTable>
          )}
          <StyledButton
            label={translate('screens/settings', 'Settings')}
            onClick={() => navigate('/settings')}
            width={StyledButtonWidth.FULL}
          />
        </StyledVerticalStack>
      )}
      {image && (
        <div className="absolute bottom-0 w-full pointer-events-none">
          <img src={image} className="w-full" />
        </div>
      )}
    </Layout>
  );
}
