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
import { useKycHelper } from 'src/hooks/kyc-helper.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';

interface FormData {
  address: UserAddress;
}

export function AccountScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { getDetailTransactions, getUnassignedTransactions } = useTransaction();
  const { limitToString, levelToString } = useKycHelper();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();
  const { user, isUserLoading } = useUserContext();
  const { getRef } = useUser();
  const { canClose, isEmbedded } = useAppHandlingContext();
  const { isInitialized } = useWalletContext();

  const rootRef = useRef<HTMLDivElement>(null);
  const [transactions, setTransactions] = useState<Partial<DetailTransaction>[]>();
  const [referral, setRefferal] = useState<Referral | undefined>();

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (isLoggedIn) {
      getRef().then(setRefferal);
      loadTransactions();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (user?.activeAddress) {
      setValue('address', user.activeAddress);
    }
  }, [user?.activeAddress]);

  useEffect(() => {
    if (user?.activeAddress && user.activeAddress.address !== selectedAddress.address) {
      switchUser(selectedAddress.address);
    }
  }, [selectedAddress]);

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

  async function switchUser(address: string): Promise<void> {
    // TODO: https://api.dfx.swiss/swagger#/User/UserController_changeUser
  }

  async function deleteUser(address: string): Promise<void> {
    // TODO: https://api.dfx.swiss/swagger#/User/UserController_deleteUser
  }

  const title = translate('screens/home', 'DFX services');
  const image = 'https://content.dfx.swiss/img/v1/services/berge.png';
  const hasBackButton = canClose && !isEmbedded;

  const transactionItems = transactions?.map((t) => ({
    label: t.date?.toLocaleString() ?? '',
    text: `${t.inputAmount} ${t.inputAsset} -> ${t.outputAmount} ${t.outputAsset}`,
  }));

  const referralItems = referral?.code
    ? [
        { label: translate('screens/home', 'Volume'), text: Utils.formatAmountCrypto(referral.volume) },
        { label: translate('screens/home', 'Credit'), text: Utils.formatAmountCrypto(referral.credit) },
        { label: translate('screens/home', 'Paid credit'), text: Utils.formatAmountCrypto(referral.paidCredit) },
        { label: translate('screens/home', 'User count'), text: referral.userCount.toString() },
        { label: translate('screens/home', 'Active user count'), text: referral.activeUserCount.toString() },
      ]
    : [];

  const totalVolumeItems = user
    ? [
        { label: translate('screens/home', 'Buy'), text: user.volumes.buy.total.toFixed(2) },
        { label: translate('screens/home', 'Sell'), text: user.volumes.sell.total.toFixed(2) },
        { label: translate('screens/home', 'Swap'), text: user.volumes.swap.total.toFixed(2) },
      ]
    : [];

  const annualVolumeItems = user
    ? [
        { label: translate('screens/home', 'Buy'), text: user.volumes.buy.annual.toFixed(2) },
        { label: translate('screens/home', 'Sell'), text: user.volumes.sell.annual.toFixed(2) },
        { label: translate('screens/home', 'Swap'), text: user.volumes.swap.annual.toFixed(2) },
      ]
    : [];

  const totalVolumeSum = user ? totalVolumeItems.reduce((acc, item) => acc + parseFloat(item.text), 0) : 0;
  const annualVolumeSum = user ? annualVolumeItems.reduce((acc, item) => acc + parseFloat(item.text), 0) : 0;

  return (
    <Layout title={isEmbedded ? title : undefined} backButton={hasBackButton} rootRef={rootRef}>
      {!isInitialized || isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <StyledVerticalStack gap={4} center full marginY={4}>
          <div className="w-full bg-dfxGray-300 p-2 rounded-md">
            <div className="bg-white w-full rounded-md">
              <Form control={control} errors={errors}>
                <StyledDropdown
                  name="address"
                  placeholder={translate('general/actions', 'Select...')}
                  items={Object.values(user!.addresses)}
                  disabled={user!.addresses.length === 0}
                  labelFunc={(item) => item.wallet}
                  descriptionFunc={(item) => item.address}
                />
              </Form>
            </div>
            <div className="flex flex-row  gap-2 w-full justify-end items-center text-dfxGray-800 text-xs pt-1.5 pr-1.5">
              <button
                onClick={() => deleteUser(selectedAddress.address)}
                className="cursor-pointer hover:text-dfxRed-150"
              >
                Delete Address
              </button>
              {' | '}
              <button onClick={() => copy(selectedAddress.address)} className="cursor-pointer hover:text-dfxRed-150">
                Copy Address
              </button>
            </div>
          </div>
          <StyledDataTable
            label={translate('screens/home', 'Activity')}
            alignContent={AlignContent.RIGHT}
            showBorder
            minWidth={false}
          >
            <StyledDataTableExpandableRow
              label={translate('screens/home', 'Total trading volume')}
              expansionItems={totalVolumeItems}
            >
              {totalVolumeSum.toFixed(2)}
            </StyledDataTableExpandableRow>
            <StyledDataTableExpandableRow
              label={translate('screens/home', 'Annual trading volume')}
              expansionItems={annualVolumeItems}
            >
              {annualVolumeSum.toFixed(2)}
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
              <StyledDataTableRow label={translate('screens/home', 'Referral code')}>
                {referral.code}
                <CopyButton onCopy={() => copy(referral.code!)} />
              </StyledDataTableRow>
              <StyledDataTableRow label={translate('screens/home', 'Referral commission')}>
                {(referral.commission * 100).toFixed(2)}%
              </StyledDataTableRow>
              <StyledDataTableExpandableRow
                label={translate('screens/home', 'Your referral stats')}
                expansionItems={referralItems}
                discreet
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
        </StyledVerticalStack>
      )}
      {image && (
        <div className="absolute bottom-0 w-full">
          <img src={image} className="w-full" />
        </div>
      )}
    </Layout>
  );
}
