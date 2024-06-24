import {
  ApiError,
  DetailTransaction,
  Referral,
  Utils,
  useAuthContext,
  useSessionContext,
  useTransaction,
  useUser,
  useUserContext,
} from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  SpinnerSize,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useRef, useState } from 'react';
import { blankedAddress } from 'src/util/utils';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';
import { useNavigation } from '../hooks/navigation.hook';

export function AccountScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { getDetailTransactions, getUnassignedTransactions } = useTransaction();
  const { isLoggedIn } = useSessionContext();
  const { session } = useAuthContext();
  const { user, isUserLoading } = useUserContext();
  const { getRef } = useUser();
  const { canClose, isEmbedded } = useAppHandlingContext();
  const { isInitialized } = useWalletContext();
  const { navigate } = useNavigation();

  const rootRef = useRef<HTMLDivElement>(null);
  const [transactions, setTransactions] = useState<Partial<DetailTransaction>[]>();
  const [referral, setRefferal] = useState<Referral | undefined>();

  useEffect(() => {
    if (isLoggedIn) {
      getRef().then((ref) => setRefferal(ref));
      console.log('referral', referral);

      loadTransactions();
    }
  }, [isLoggedIn]);

  async function loadTransactions(): Promise<void> {
    Promise.all([getDetailTransactions(), getUnassignedTransactions()])
      .then((txs) => {
        const sorted = txs.flat().sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : -1)) as DetailTransaction[];
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
      .catch((error: ApiError) => console.error(error.message ?? 'Unknown error'));
  }

  const title = translate('screens/home', 'DFX services');
  const image = 'https://content.dfx.swiss/img/v1/services/berge.png';
  const hasBackButton = canClose && !isEmbedded;

  const transactionItems = transactions?.map((t) => ({
    label: t.date?.toLocaleString() ?? '',
    text: `${t.inputAmount} ${t.inputAsset} -> ${t.outputAmount} ${t.outputAsset}`,
  }));

  const addressesByVolume = user?.addresses.map((a) => ({
    label: blankedAddress(a.address),
    text: (a.volumes.buy.total + a.volumes.sell.total + a.volumes.swap.total).toString(),
  }));

  const referralItems = referral?.code
    ? [
        { label: 'Volume', text: Utils.formatAmountCrypto(referral.volume) },
        { label: 'Credit', text: Utils.formatAmountCrypto(referral.credit) },
        { label: 'Paid Credit', text: Utils.formatAmountCrypto(referral.paidCredit) },
        { label: 'User Count', text: referral.userCount.toString() },
        { label: 'Active User Count', text: referral.activeUserCount.toString() },
      ]
    : [];

  return (
    <Layout title={isEmbedded ? title : undefined} backButton={hasBackButton} rootRef={rootRef}>
      {!isInitialized || isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <StyledVerticalStack gap={4} center full marginY={4}>
          <StyledDataTable
            label={translate('screens/home', 'Account')}
            alignContent={AlignContent.RIGHT}
            showBorder
            minWidth={false}
          >
            <StyledDataTableRow label={translate('screens/home', 'Active address')}>
              {blankedAddress(session?.address || '', 10)}
              <CopyButton onCopy={() => copy(`${session?.address}`)} />
            </StyledDataTableRow>
            {transactionItems && transactionItems.length > 0 && (
              <StyledDataTableExpandableRow
                label={translate('screens/home', 'Transactions')}
                expansionItems={transactionItems}
                discreet
              />
            )}
            {addressesByVolume && addressesByVolume.length > 0 && (
              <StyledDataTableExpandableRow
                label={translate('screens/home', 'Addresses by volume')}
                expansionItems={addressesByVolume}
                discreet
              />
            )}
          </StyledDataTable>
          <StyledDataTable
            label={translate('screens/home', 'Referral')}
            alignContent={AlignContent.RIGHT}
            showBorder
            minWidth={false}
          >
            <StyledDataTableRow label={translate('screens/home', 'Referral Code')}>
              {referral?.code ? referral.code : 'N/A'}
              {referral?.code && <CopyButton onCopy={() => copy(referral.code!)} />}
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/home', 'Commission')}>
              {Utils.formatAmountCrypto(referral?.commission ? referral.commission * 100 : 0)}%
            </StyledDataTableRow>
            <StyledDataTableExpandableRow
              label={translate('screens/home', 'Your Referral Stats')}
              expansionItems={referralItems}
              discreet
            />
          </StyledDataTable>
          <StyledDataTable
            label={translate('screens/home', 'KYC')}
            alignContent={AlignContent.RIGHT}
            showBorder
            minWidth={false}
          >
            <StyledDataTableRow label={translate('screens/home', 'Level')}>{user?.kyc.level}</StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/home', 'Trading Limit')}>
              {user?.tradingLimit.limit}
            </StyledDataTableRow>
          </StyledDataTable>
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
