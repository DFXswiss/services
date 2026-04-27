import { KycStatus, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledIconButton,
  StyledInfoText,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
  BankTxSearchResult,
  ComplianceSearchResult,
  PendingOnboardingInfo,
  PendingReviewStatus,
  PendingReviewSummaryEntry,
  UserSearchResult,
  useCompliance,
} from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { cacheBankTx } from 'src/util/bank-tx-cache';

interface FormData {
  key: string;
}

export default function ComplianceScreen(): JSX.Element {
  useComplianceGuard();

  const { translate, translateError } = useSettingsContext();
  const { search, downloadUserFiles, getPendingOnboardings, getPendingReviews } = useCompliance();
  const { navigate } = useNavigation();
  const { search: query } = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [searchResult, setSearchResult] = useState<ComplianceSearchResult>();
  const [showInfo, setShowInfo] = useState(false);
  const [downloadingUserId, setDownloadingUserId] = useState<number>();
  const [pendingOnboardings, setPendingOnboardings] = useState<PendingOnboardingInfo[]>([]);
  const [pendingReviews, setPendingReviews] = useState<PendingReviewSummaryEntry[]>([]);

  const paramSearch = new URLSearchParams(query).get('search') || undefined;

  useEffect(() => {
    getPendingOnboardings()
      .then(setPendingOnboardings)
      .catch(() => setPendingOnboardings([]));
    getPendingReviews()
      .then(setPendingReviews)
      .catch(() => setPendingReviews([]));
  }, []);

  useEffect(() => {
    if (paramSearch) onSubmit({ key: paramSearch });
  }, [paramSearch]);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onChange', defaultValues: { key: paramSearch } });

  async function onSubmit(data: FormData) {
    navigate({ search: `search=${data.key}` });

    setIsLoading(true);
    setError(undefined);
    setSearchResult(undefined);

    search(data.key)
      .then(setSearchResult)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  async function handleDownloadUserData(userId: number) {
    setDownloadingUserId(userId);
    setError(undefined);

    downloadUserFiles([userId])
      .catch((e) => setError(e.message))
      .finally(() => setDownloadingUserId(undefined));
  }

  const rules = Utils.createRules({
    key: Validations.Required,
  });

  const searchExamples = [
    { label: 'ID', example: '1' },
    { label: 'Email', example: 'user@example.com' },
    { label: 'Phone', example: '+xxxxxxxxxxx' },
    { label: 'IP address', example: '192.168.1.1' },
    { label: 'KYC hash', example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { label: 'Bank reference', example: 'xxxx-xxxx-xxxx' },
    { label: 'Referral code', example: 'xxx-xxx' },
    { label: 'Blockchain address', example: '0x... or bc1... etc.' },
    { label: 'Transaction ID', example: 'Blockchain TX hash' },
    { label: 'Name', example: 'Min. 2 characters' },
  ];

  const userTableData = [
    {
      key: 'userId',
      label: translate('screens/compliance', 'ID'),
      render: (u: UserSearchResult) => u.id,
    },
    {
      key: 'accountType',
      label: translate('screens/kyc', 'Account Type'),
      render: (u: UserSearchResult) => u.accountType ?? '-',
    },
    {
      key: 'name',
      label: translate('screens/kyc', 'Name'),
      render: (u: UserSearchResult) => u.name ?? '-',
    },
    {
      key: 'email',
      label: translate('screens/compliance', 'Email'),
      cellClassName: 'break-all',
      render: (u: UserSearchResult) => u.mail ?? '-',
    },
    {
      key: 'actions',
      label: '',
      cellClassName: 'whitespace-nowrap',
      render: (u: UserSearchResult) => (
        <div className="flex gap-2 justify-end items-center">
          <StyledIconButton
            icon={IconVariant.FILE}
            color={IconColor.BLUE}
            size={IconSize.SM}
            onClick={() => handleDownloadUserData(u.id)}
            isLoading={downloadingUserId === u.id}
          />
          <button
            className="px-2 py-1 text-xs font-medium text-white rounded transition-colors bg-dfxBlue-800 hover:bg-dfxBlue-800/80"
            onClick={() => navigate(`compliance/user/${u.id}/kyc`)}
          >
            KYC
          </button>
          <button
            className="px-2 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
            onClick={() => navigate(`compliance/user/${u.id}`)}
          >
            Details
          </button>
        </div>
      ),
    },
  ];

  const bankTxTableData = [
    {
      key: 'id',
      label: translate('screens/compliance', 'ID'),
      render: (b: BankTxSearchResult) => b.id,
    },
    {
      key: 'type',
      label: translate('screens/compliance', 'Type'),
      render: (b: BankTxSearchResult) => b.type,
    },
    {
      key: 'accountServiceRef',
      label: translate('screens/compliance', 'Account Service Ref'),
      render: (b: BankTxSearchResult) => b.accountServiceRef,
    },
    {
      key: 'amount',
      label: translate('screens/compliance', 'Amount'),
      render: (b: BankTxSearchResult) => `${b.amount} ${b.currency}`,
    },
    {
      key: 'name',
      label: translate('screens/compliance', 'User name'),
      render: (b: BankTxSearchResult) => b.name ?? '-',
    },
    {
      key: 'actions',
      label: '',
      render: (b: BankTxSearchResult) => (
        <div className="flex gap-2 justify-end items-center">
          <StyledIconButton
            icon={IconVariant.FORWARD}
            color={IconColor.BLUE}
            size={IconSize.SM}
            onClick={() => {
              cacheBankTx(b);
              navigate(`compliance/bank-tx/${b.id}`);
            }}
          />
        </div>
      ),
    },
  ];

  useLayoutOptions({ title: translate('screens/compliance', 'Compliance') });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <div className="w-full">
          <div className="flex items-center gap-2 mb-1 pl-3">
            <label className="text-base font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Database search')}
            </label>
            <StyledIconButton
              icon={showInfo ? IconVariant.INFO : IconVariant.INFO_OUTLINE}
              color={IconColor.DARK_GRAY}
              size={IconSize.SM}
              onClick={() => setShowInfo(!showInfo)}
            />
          </div>
          {showInfo && (
            <div className="mb-2">
              <StyledInfoText iconColor={IconColor.BLUE}>
                <div className="text-left">
                  <strong>Search by:</strong>
                  <ul className="mt-1 ml-4 list-disc text-left text-sm">
                    {searchExamples.map((e) => (
                      <li key={e.label}>
                        <strong>{e.label}:</strong> {e.example}
                      </li>
                    ))}
                  </ul>
                </div>
              </StyledInfoText>
            </div>
          )}
          <StyledInput
            name="key"
            type="text"
            hideLabel
            placeholder={translate('screens/kyc', 'example@mail.com')}
            full
          />
        </div>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Search')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isLoading}
        />
        {searchResult &&
          (searchResult.userDatas.length + searchResult.bankTx.length > 0 ? (
            <>
              <div>
                <h1 className="text-dfxGray-700">{translate('screens/compliance', 'Matching Entries')}</h1>
                <p className="text-dfxGray-700">
                  ({translate('screens/compliance', 'found by {{type}}', { type: searchResult.type })})
                </p>
              </div>

              {searchResult.userDatas.length > 0 && (
                <div className="w-full">
                  <h2 className="text-dfxGray-700">{translate('screens/compliance', 'Customers')}</h2>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                      <thead>
                        <tr className="bg-dfxGray-300">
                          {userTableData.map((column) => (
                            <th key={column.key} className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {searchResult.userDatas.map((u) => {
                          const isRedRow = [KycStatus.CHECK, KycStatus.REJECTED].includes(u.kycStatus);
                          return (
                            <tr
                              key={u.id}
                              className={`border-b border-dfxGray-300 transition-colors ${
                                isRedRow ? 'bg-dfxRed-100 hover:bg-dfxRed-150' : 'hover:bg-dfxGray-300'
                              }`}
                            >
                              {userTableData.map((column) => (
                                <td
                                  key={column.key}
                                  className={`px-4 py-3 text-left text-sm text-dfxBlue-800 ${
                                    'cellClassName' in column ? column.cellClassName : ''
                                  }`}
                                >
                                  {column.render(u)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {searchResult.bankTx.length > 0 && (
                <div className="w-full">
                  <h2 className="text-dfxGray-700">{translate('screens/compliance', 'Bank Transactions')}</h2>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                      <thead>
                        <tr className="bg-dfxGray-300">
                          {bankTxTableData.map((column) => (
                            <th key={column.key} className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {searchResult.bankTx.map((u) => {
                          return (
                            <tr
                              key={u.id}
                              className={`border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300`}
                            >
                              {bankTxTableData.map((column) => (
                                <td key={column.key} className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                                  {column.render(u)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-dfxGray-700">{translate('screens/compliance', 'No entries found')}</p>
          ))}

        {pendingOnboardings.length > 0 && (
          <div className="w-full">
            <h2 className="text-dfxGray-700">
              {translate('screens/compliance', 'Pending Onboardings')} ({pendingOnboardings.length})
            </h2>
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-dfxGray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'ID')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/kyc', 'Account Type')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/kyc', 'Name')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Date')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800" />
                  </tr>
                </thead>
                <tbody>
                  {pendingOnboardings.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                      onClick={() => navigate(`compliance/user/${o.id}/kyc`)}
                    >
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{o.id}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{o.accountType ?? '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{o.name ?? '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                        {new Date(o.date).toLocaleDateString('de-CH')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="px-2 py-1 text-xs font-medium bg-dfxBlue-800 text-white rounded hover:bg-dfxBlue-800/80 transition-colors"
                          onClick={() => navigate(`compliance/user/${o.id}/kyc`)}
                        >
                          Onboarding
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pendingReviews.length > 0 && (
          <div className="w-full">
            <h2 className="text-dfxGray-700">
              {translate('screens/compliance', 'Pending Reviews')} (
              {pendingReviews.reduce((sum, r) => sum + r.manualReview + r.internalReview, 0)})
            </h2>
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-dfxGray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Type')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/kyc', 'Name')}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Manual Review')}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-dfxBlue-800">
                      {translate('screens/compliance', 'Internal Review')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReviews.map((r) => (
                    <Fragment key={`${r.type}-${r.name}`}>
                      {[PendingReviewStatus.MANUAL_REVIEW, PendingReviewStatus.INTERNAL_REVIEW].map((s) => {
                        const isManual = s === PendingReviewStatus.MANUAL_REVIEW;
                        const count = isManual ? r.manualReview : r.internalReview;
                        if (count === 0) return null;
                        const valueCell = 'px-4 py-3 text-right text-sm text-dfxBlue-800 font-semibold';
                        const emptyCell = 'px-4 py-3 text-right text-sm text-dfxGray-600';
                        return (
                          <tr
                            key={s}
                            className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300 cursor-pointer"
                            onClick={() => navigate(`compliance/pending-reviews/${r.type}/${r.name}?status=${s}`)}
                          >
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{r.type}</td>
                            <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{r.name}</td>
                            <td className={isManual ? valueCell : emptyCell}>{isManual ? count : '-'}</td>
                            <td className={isManual ? emptyCell : valueCell}>{isManual ? '-' : count}</td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </StyledVerticalStack>
    </Form>
  );
}
