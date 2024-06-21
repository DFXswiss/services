import {
  Blockchain,
  CryptoPaymentMethod,
  DetailTransaction,
  FiatPaymentMethod,
  Referral,
  TransactionFailureReason,
  TransactionState,
  TransactionType,
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
  DfxIcon,
  IconVariant,
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

const dummyTransactionsMap = [
  {
    id: 1,
    uid: 'T1',
    type: TransactionType.BUY,
    state: TransactionState.COMPLETED,
    inputAmount: 100,
    inputAsset: 'dUSDT',
    inputBlockchain: Blockchain.ETHEREUM,
    inputPaymentMethod: CryptoPaymentMethod.CRYPTO,
    inputTxId: '0x1234567890',
    inputTxUrl: 'https://etherscan.io/tx/0x1234567890',
    date: new Date('2022-01-01T12:00:00Z'),
    reason: TransactionFailureReason.FEE_TOO_HIGH,
    outputAsset: 'dBTC',
    outputAmount: 0.01,
    outputTxUrl: 'https://blockchain.info/tx/0x1234567890',
    fees: {
      rate: 0.01,
      fixed: 0.1,
      min: 0.1,
      dfx: 0.01,
      network: 0.001,
      total: 0.011,
    },
    exchangeRate: 10000,
    rate: 10000,
    priceSteps: [
      {
        source: 'Kraken',
        from: 'dUSDT',
        to: 'dCHF',
        price: 10000,
        timestamp: new Date('2022-01-01T12:00:00Z'),
      },
      {
        source: 'Binance',
        from: 'dCHF',
        to: 'dBTC',
        price: 0.00001,
        timestamp: new Date('2022-01-01T12:00:00Z'),
      },
    ],
  },
  {
    id: 193040,
    uid: 'T15E84121A935DBEB',
    type: TransactionType.SELL,
    state: TransactionState.COMPLETED,
    reason: TransactionFailureReason.INSTANT_PAYMENT,
    inputAmount: 0.0065,
    inputAsset: 'BTC',
    inputAssetId: 113,
    inputBlockchain: Blockchain.BITCOIN,
    inputPaymentMethod: CryptoPaymentMethod.CRYPTO,
    exchangeRate: 0.00001738,
    rate: 0.000017825,
    outputAmount: 364.66,
    outputAsset: 'CHF',
    outputAssetId: 1,
    outputBlockchain: Blockchain.BITCOIN,
    outputPaymentMethod: FiatPaymentMethod.BANK,
    priceSteps: [
      {
        source: 'Binance',
        from: 'BTC',
        to: 'USDT',
        price: 0.000015364,
        timestamp: new Date('2024-06-19T16:40:03.617Z'),
      },
      {
        source: 'Kraken',
        from: 'USDT',
        to: 'CHF',
        price: 1.1312,
        timestamp: new Date('2024-06-19T16:40:02.791Z'),
      },
    ],
    feeAmount: 0.00016195,
    feeAsset: 'BTC',
    fees: {
      rate: 0.0149,
      fixed: 0,
      min: 0,
      network: 0.0000651,
      dfx: 0.00009685,
      total: 0.00016195,
    },
    inputTxId: '45265cfd31ce5f30099f90c6c5227e863aad1f7d3faf800d952fe839ed37b27c',
    inputTxUrl: 'https://explorer.lightning.space/tx/45265cfd31ce5f30099f90c6c5227e863aad1f7d3faf800d952fe839ed37b27c',
    outputTxId: 'DFX Payment: 754409388',
    outputTxUrl: undefined,
    date: new Date('2024-06-19T20:01:43.930Z'),
    externalTransactionId: undefined,
  },
];

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
    }

    loadTransactions().then(setTransactions);
  }, []);

  async function loadTransactions(): Promise<Partial<DetailTransaction>[]> {
    // const results = await Promise.all([getDetailTransactions(), getUnassignedTransactions()]).catch((err) => {
    //   console.error('Error loading transactions:', err);
    //   return [];
    // });
    // const sorted = results.flat().sort((a, b) => (new Date(b.date) > new Date(a.date) ? 1 : -1)) as DetailTransaction[];
    // TODO: Change back to sorted when transactions are available
    return dummyTransactionsMap.map((t) => ({
      id: t.id,
      inputAsset: t.inputAsset,
      inputAmount: t.inputAmount,
      outputAsset: t.outputAsset,
      outputAmount: t.outputAmount,
      date: t.date,
    }));
  }

  const title = translate('screens/home', 'DFX services');
  const image = 'https://content.dfx.swiss/img/v1/services/berge.png';
  const hasBackButton = canClose && !isEmbedded;

  const transactionItems = transactions?.map((t) => ({
    label: t.date?.toString() ?? '',
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
              {Utils.formatAmountCrypto(referral?.commission || 0)}
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
            <StyledDataTableRow label={translate('screens/home', 'Status')}>
              <button
                className="flex flex-row gap-2 items-center"
                onClick={() => navigate('/profile', { setRedirect: true })}
                disabled={user?.kyc.dataComplete}
              >
                {user?.kyc.dataComplete ? 'Complete' : 'Incomplete'}
                {!user?.kyc.dataComplete && <DfxIcon icon={IconVariant.ARROW_RIGHT} />}
              </button>
            </StyledDataTableRow>
            <StyledDataTableRow label={translate('screens/home', 'Level')}>{user?.kyc.level}</StyledDataTableRow>
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
