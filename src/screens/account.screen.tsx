import {
  ApiError,
  Blockchain,
  DetailTransaction,
  PdfDocument,
  Referral,
  UserAddress,
  Utils,
  Validations,
  useApi,
  useAuthContext,
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
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledDropdown,
  StyledIconButton,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import {
  CreateRecommendation,
  Recommendation,
  RecommendationStatus,
  RecommendationType,
} from 'src/dto/recommendation.dto';
import useRecommendation from 'src/hooks/recommendation.hook';
import { Modal } from 'src/components/modal';
import { addressLabel } from 'src/config/labels';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useKycHelper } from 'src/hooks/kyc-helper.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { blankedAddress, downloadPdfFromString, partition, sortAddressesByBlockchain, url } from 'src/util/utils';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';

// Supported EVM blockchains for balance PDF (must match API's SUPPORTED_BLOCKCHAINS)
const SUPPORTED_PDF_BLOCKCHAINS: Blockchain[] = [
  Blockchain.ETHEREUM,
  Blockchain.BINANCE_SMART_CHAIN,
  Blockchain.POLYGON,
  Blockchain.ARBITRUM,
  Blockchain.OPTIMISM,
  Blockchain.BASE,
  Blockchain.GNOSIS,
];

enum FiatCurrency {
  CHF = 'CHF',
  EUR = 'EUR',
  USD = 'USD',
}

interface FormData {
  address: UserAddress;
}

interface PdfFormData {
  blockchain: Blockchain;
  currency: FiatCurrency;
  date: string;
}

interface RecommendationFormData {
  recommendedAlias: string;
  recommendedMail: string;
}

export default function AccountScreen(): JSX.Element {
  const { translate, translateError, language, locale } = useSettingsContext();
  const { getDetailTransactions, getUnassignedTransactions } = useTransaction();
  const { limitToString, levelToString } = useKycHelper();
  const { navigate } = useNavigation();
  const { isLoggedIn } = useSessionContext();
  const { user, isUserLoading, userAddresses } = useUserContext();
  const { getRef } = useUser();
  const { width } = useWindowContext();
  const { canClose, isEmbedded } = useAppHandlingContext();
  const { isInitialized, setWallet } = useWalletContext();
  const { changeAddress } = useUserContext();
  const { session } = useAuthContext();
  const { rootRef } = useLayoutContext();
  const { call } = useApi();
  const { getRecommendations, createRecommendation, confirmRecommendation, rejectRecommendation } = useRecommendation();
  const [transactions, setTransactions] = useState<Partial<DetailTransaction>[]>();
  const [referral, setRefferal] = useState<Referral | undefined>();
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string>();

  // Recommendation state
  const [recommendations, setRecommendations] = useState<Recommendation[]>();
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [isCreatingRecommendation, setIsCreatingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string>();
  const [processingRecommendationId, setProcessingRecommendationId] = useState<number>();
  const [isConfirmingRecommendation, setIsConfirmingRecommendation] = useState(false);

  const [pendingRequests, invitations] = useMemo(
    () =>
      partition(
        recommendations,
        (r) => r.type === RecommendationType.REQUEST && r.status === RecommendationStatus.PENDING,
      ),
    [recommendations],
  );

  const isKycLevel50 = user && user.kyc.level >= 50;

  useUserGuard('/login');

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const {
    control: pdfControl,
    formState: { errors: pdfErrors },
    handleSubmit: handlePdfSubmit,
    setValue: setPdfValue,
    reset: resetPdfForm,
  } = useForm<PdfFormData>();

  const {
    control: recommendationControl,
    formState: { errors: recommendationErrors, isValid: isRecommendationFormValid },
    handleSubmit: handleRecommendationSubmit,
    reset: resetRecommendationForm,
  } = useForm<RecommendationFormData>({ mode: 'onTouched' });

  const selectedAddress = useWatch({ control, name: 'address' });
  const selectedPdfBlockchain = useWatch({ control: pdfControl, name: 'blockchain' });
  const selectedPdfCurrency = useWatch({ control: pdfControl, name: 'currency' });
  const selectedPdfDate = useWatch({ control: pdfControl, name: 'date' });

  const supportedBlockchains = selectedAddress?.blockchains.filter((b) => SUPPORTED_PDF_BLOCKCHAINS.includes(b)) ?? [];
  const canDownloadPdf = supportedBlockchains.length > 0;

  useEffect(() => {
    if (user?.activeAddress && !isUserLoading && isLoggedIn) {
      loadRefferal();
      setValue('address', user.activeAddress);
    }
  }, [user?.activeAddress, isUserLoading, session?.role, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) loadTransactions();
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && isKycLevel50) loadRecommendations();
  }, [isLoggedIn, isKycLevel50]);

  useEffect(() => {
    if (selectedAddress?.address && user?.activeAddress?.address !== selectedAddress?.address && !isUserLoading) {
      changeAddress(selectedAddress.address)
        .then(() => setWallet())
        .catch(() => {
          // ignore errors
        });
    }
  }, [selectedAddress, user?.activeAddress, !isUserLoading]);

  async function loadRefferal(): Promise<void> {
    return getRef().then(setRefferal);
  }

  async function loadRecommendations(): Promise<void> {
    return getRecommendations()
      .then((r) =>
        setRecommendations(
          r.sort((a, b) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime()),
        ),
      )
      .catch(() => {
        // ignore errors
      });
  }

  function openRecommendationModal(): void {
    setRecommendationError(undefined);
    setShowRecommendationModal(true);
  }

  function closeRecommendationModal(): void {
    setShowRecommendationModal(false);
    resetRecommendationForm();
    setRecommendationError(undefined);
  }

  function onRecommendationSubmit(data: CreateRecommendation): void {
    setIsCreatingRecommendation(true);
    setRecommendationError(undefined);

    createRecommendation(data)
      .then(() => {
        resetRecommendationForm();
        closeRecommendationModal();
        return loadRecommendations();
      })
      .catch((error: ApiError) => setRecommendationError(error.message ?? 'Unknown error'))
      .finally(() => setIsCreatingRecommendation(false));
  }

  function handleRecommendationAction(recommendation: Recommendation, confirm: boolean): void {
    setRecommendationError(undefined);
    setProcessingRecommendationId(recommendation.id);
    setIsConfirmingRecommendation(confirm);

    const action = confirm ? confirmRecommendation : rejectRecommendation;

    action(recommendation)
      .then(() => loadRecommendations())
      .catch((error: ApiError) => setRecommendationError(error.message ?? 'Unknown error'))
      .finally(() => {
        setProcessingRecommendationId(undefined);
        setIsConfirmingRecommendation(false);
      });
  }

  const recommendationRules = Utils.createRules({
    recommendedAlias: Validations.Required,
    recommendedMail: Validations.Mail,
  });

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
            uid: t.uid,
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

  function openPdfModal(): void {
    setPdfError(undefined);

    // Set defaults
    if (supportedBlockchains.length > 0) setPdfValue('blockchain', supportedBlockchains[0]);
    setPdfValue('currency', FiatCurrency.CHF);
    setPdfValue('date', new Date().toISOString().split('T')[0]);

    setShowPdfModal(true);
  }

  function closePdfModal(): void {
    setShowPdfModal(false);
    resetPdfForm();
    setPdfError(undefined);
  }

  async function downloadBalancePdf(data: PdfFormData): Promise<void> {
    if (!selectedAddress) return;

    const blockchain = supportedBlockchains.length === 1 ? supportedBlockchains[0] : data.blockchain;
    if (!blockchain) return;

    setIsPdfLoading(true);
    setPdfError(undefined);

    try {
      const params = new URLSearchParams({
        address: selectedAddress.address,
        blockchain: blockchain,
        currency: data.currency,
        date: data.date,
        language: language?.symbol ?? 'EN',
      });

      const response = await call<PdfDocument>({
        url: `balance/pdf?${params.toString()}`,
        method: 'GET',
      });

      const filename = `${data.date}_DFX_Balance_Report_${blockchain}.pdf`;
      downloadPdfFromString(response.pdfData, filename);
      closePdfModal();
    } catch (e) {
      setPdfError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsPdfLoading(false);
    }
  }

  const transactionItems = transactions?.map((t) => ({
    label: new Date(t.date as Date).toLocaleString(),
    text: `${t.inputAsset ? `${t.inputAmount ?? ''} ${t.inputAsset}` : ''} ${
      t.inputAsset && t.outputAsset ? ' → ' : ''
    } ${t.outputAsset ? `${t.outputAmount ?? ''} ${t.outputAsset}` : ''}`,
    icon: IconVariant.ARROW_RIGHT,
    onClick: () => navigate(`/tx/${t.id ?? t.uid}`),
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

  const title = isEmbedded ? translate('screens/home', 'DFX services') : translate('screens/home', 'Account');
  const hasBackButton = canClose && !isEmbedded;
  const image = 'https://dfx.swiss/images/app/berge.jpg';

  useLayoutOptions({ title, backButton: hasBackButton });

  return (
    <>
      {!isInitialized || !isLoggedIn || isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <StyledVerticalStack gap={4} center full marginY={4} className="z-10">
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
                  <StyledIconButton
                    icon={IconVariant.ARROW_UP}
                    onClick={() =>
                      user.kyc.level < 50
                        ? navigate('/kyc')
                        : navigate({ pathname: '/support/issue', search: '?issue-type=LimitRequest' })
                    }
                  />
                </div>
              </StyledDataTableRow>
            </StyledDataTable>
          )}

          {referral?.code && (
            <StyledDataTable
              label={translate('screens/home', 'Referral')}
              alignContent={AlignContent.RIGHT}
              showBorder
              minWidth={false}
            >
              <StyledDataTableRow label={translate('screens/home', 'Referral link')}>
                {referral.code}
                <CopyButton
                  onCopy={() =>
                    copy(
                      url({
                        base: process.env.REACT_APP_REF_URL,
                        params: new URLSearchParams({ code: referral.code ?? '' }),
                      }),
                    )
                  }
                />
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

          {/* Recommendations Section (KYC Level 50+) */}
          {isKycLevel50 && (
            <>
              {/* Pending Recommendation Requests */}
              {pendingRequests.length > 0 && (
                <StyledDataTable
                  label={translate('screens/recommendation', 'Pending Requests')}
                  alignContent={AlignContent.RIGHT}
                  showBorder
                  minWidth={false}
                >
                  {pendingRequests.map((recommendation) => (
                    <StyledDataTableRow
                      key={recommendation.id}
                      label={`${recommendation.name} (${recommendation.mail})`}
                    >
                      <div className="flex justify-end gap-2">
                        <StyledButton
                          width={StyledButtonWidth.MIN}
                          color={StyledButtonColor.WHITE}
                          label={translate('general/actions', 'Confirm')}
                          onClick={() => handleRecommendationAction(recommendation, true)}
                          disabled={processingRecommendationId === recommendation.id}
                          isLoading={processingRecommendationId === recommendation.id && isConfirmingRecommendation}
                          deactivateMargin
                        />
                        <StyledButton
                          width={StyledButtonWidth.MIN}
                          color={StyledButtonColor.GRAY_OUTLINE}
                          label={translate('general/actions', 'Reject')}
                          onClick={() => handleRecommendationAction(recommendation, false)}
                          disabled={processingRecommendationId === recommendation.id}
                          isLoading={processingRecommendationId === recommendation.id && !isConfirmingRecommendation}
                          deactivateMargin
                        />
                      </div>
                    </StyledDataTableRow>
                  ))}
                </StyledDataTable>
              )}

              {/* Invitations List */}
              {invitations.length > 0 && (
                <StyledDataTable
                  label={translate('screens/recommendation', 'Your Invitations')}
                  alignContent={AlignContent.RIGHT}
                  showBorder
                  minWidth={false}
                >
                  {invitations.map((recommendation) => {
                    const items = [];

                    if (recommendation.mail)
                      items.push({
                        label: translate('screens/kyc', 'Email'),
                        text: recommendation.mail ?? '',
                      });

                    if (recommendation.code) {
                      const link = url({
                        path: 'login',
                        params: new URLSearchParams({ 'recommendation-code': recommendation.code }),
                      });

                      items.push(
                        ...[
                          {
                            label: translate('screens/recommendation', 'Code'),
                            text: recommendation.code,
                            onClick: () => copy(recommendation.code ?? ''),
                            isCopy: true,
                          },
                          {
                            label: translate('screens/payment', 'Link'),
                            text: blankedAddress(link, { width }),
                            onClick: () => copy(link),
                            isCopy: true,
                          },
                        ],
                      );
                    }

                    items.push({
                      label: translate('screens/payment', 'Expiry date'),
                      text: new Date(recommendation.expirationDate).toLocaleDateString(locale),
                    });

                    return (
                      <StyledDataTableExpandableRow
                        key={recommendation.id}
                        label={recommendation.name ?? ''}
                        expansionItems={items}
                      >
                        <p>{translate('screens/recommendation', recommendation.status)}</p>
                      </StyledDataTableExpandableRow>
                    );
                  })}
                </StyledDataTable>
              )}

              {recommendationError && <ErrorHint message={recommendationError} />}

              {/* Create Invitation Button */}
              <StyledButton
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.RED}
                label={translate('screens/recommendation', 'Create invitation')}
                onClick={openRecommendationModal}
              />
            </>
          )}

          {/* Wallet Selector */}
          {userAddresses.length ? (
            <>
              <div className="border-b my-2.5 border-dfxGray-400 w-full"></div>

              <div className="bg-white w-full rounded-md mb-2">
                <h2 className="text-center text-dfxBlue-800 text-sm font-semibold ml-3.5 mb-1.5">
                  {translate('screens/home', 'Active address')}
                </h2>
                <Form control={control} errors={errors}>
                  <StyledDropdown
                    name="address"
                    rootRef={rootRef}
                    placeholder={translate('general/actions', 'Select') + '...'}
                    items={userAddresses.sort(sortAddressesByBlockchain)}
                    labelFunc={(item) => blankedAddress(addressLabel(item), { width })}
                    descriptionFunc={(item) => item.label ?? item.wallet}
                    forceEnable={user?.activeAddress === undefined}
                  />
                </Form>
              </div>

              {canDownloadPdf && (
                <StyledButton
                  label={translate('screens/home', 'PDF Download Address Report')}
                  onClick={openPdfModal}
                  width={StyledButtonWidth.FULL}
                  color={StyledButtonColor.STURDY_WHITE}
                />
              )}
            </>
          ) : (
            <></>
          )}

          {/* Spacer for background image overlap */}
          <div className="h-32" />
        </StyledVerticalStack>
      )}
      {image && (
        <div className="absolute bottom-0 w-full pointer-events-none">
          <img src={image} className="w-full" />
        </div>
      )}

      {/* PDF Download Modal */}
      <Modal isOpen={showPdfModal} onClose={closePdfModal}>
        <StyledVerticalStack gap={6} full>
          <h2 className="text-dfxBlue-800 text-xl font-bold">
            {translate('screens/home', 'PDF Download Address Report')}
          </h2>

          <Form control={pdfControl} errors={pdfErrors} onSubmit={handlePdfSubmit(downloadBalancePdf)}>
            <StyledVerticalStack gap={4} full>
              {supportedBlockchains.length > 1 && (
                <StyledDropdown<Blockchain>
                  name="blockchain"
                  rootRef={rootRef}
                  label={translate('screens/home', 'Blockchain')}
                  placeholder={translate('general/actions', 'Select') + '...'}
                  items={supportedBlockchains}
                  labelFunc={(item) => item}
                  full
                />
              )}

              <StyledDropdown<FiatCurrency>
                name="currency"
                rootRef={rootRef}
                label={translate('screens/home', 'Currency')}
                placeholder={translate('general/actions', 'Select') + '...'}
                items={Object.values(FiatCurrency)}
                labelFunc={(item) => item}
                full
              />

              <StyledInput name="date" type="date" label={translate('screens/home', 'Date')} full />

              {pdfError && <p className="text-dfxRed-100 text-sm">{pdfError}</p>}

              <StyledButton
                type="submit"
                label={translate('general/actions', 'Download')}
                onClick={handlePdfSubmit(downloadBalancePdf)}
                width={StyledButtonWidth.FULL}
                isLoading={isPdfLoading}
                disabled={
                  (supportedBlockchains.length > 1 && !selectedPdfBlockchain) ||
                  !selectedPdfCurrency ||
                  !selectedPdfDate
                }
              />

              <StyledButton
                label={translate('general/actions', 'Cancel')}
                onClick={closePdfModal}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </StyledVerticalStack>
          </Form>
        </StyledVerticalStack>
      </Modal>

      {/* Create Recommendation Modal */}
      <Modal isOpen={showRecommendationModal} onClose={closeRecommendationModal}>
        <StyledVerticalStack gap={6} full>
          <h2 className="text-dfxBlue-800 text-xl font-bold">
            {translate('screens/recommendation', 'Create invitation')}
          </h2>

          <p className="text-dfxGray-700">
            {translate('screens/recommendation', 'Who would you like to invite?')}
          </p>

          <Form
            control={recommendationControl}
            rules={recommendationRules}
            errors={recommendationErrors}
            onSubmit={handleRecommendationSubmit(onRecommendationSubmit)}
            translate={translateError}
          >
            <StyledVerticalStack gap={4} full>
              <StyledInput
                name="recommendedAlias"
                label={translate('screens/kyc', 'Name')}
                placeholder={translate('screens/kyc', 'John Doe')}
                full
              />
              <StyledInput
                name="recommendedMail"
                label={translate('screens/kyc', 'Email')}
                placeholder={translate('screens/kyc', 'example@mail.com')}
                full
              />

              {recommendationError && <ErrorHint message={recommendationError} />}

              <StyledButton
                type="submit"
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.BLUE}
                label={translate('screens/recommendation', 'Create invitation')}
                onClick={handleRecommendationSubmit(onRecommendationSubmit)}
                disabled={!isRecommendationFormValid}
                isLoading={isCreatingRecommendation}
              />

              <StyledButton
                label={translate('general/actions', 'Cancel')}
                onClick={closeRecommendationModal}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </StyledVerticalStack>
          </Form>
        </StyledVerticalStack>
      </Modal>
    </>
  );
}
