import { useAuthContext, UserRole, useKyc } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BankDatasTable,
  BuyRoutesTable,
  KycLogsTable,
  KycStepsTable,
  NotificationsTable,
  RefRewardsTable,
  SellRoutesTable,
  SwapRoutesTable,
  UsersTable,
  VirtualIbansTable,
} from 'src/components/compliance/detail-tabs';
import { FilePreviewPanel } from 'src/components/compliance/file-preview-panel';
import { IpLogsPanel } from 'src/components/compliance/ip-logs-panel';
import { KycFilesPanel } from 'src/components/compliance/kyc-files-panel';
import { RecommendationPanel } from 'src/components/compliance/recommendation-panel';
import { SupportIssuesPanel } from 'src/components/compliance/support-issues-panel';
import { TransactionsTable } from 'src/components/compliance/transactions-tab';
import { UserDataPanel } from 'src/components/compliance/user-data-panel';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ComplianceUserData, KycFile, useCompliance } from 'src/hooks/compliance.hook';
import { useSupportDashboardGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

type TabType =
  | 'transactions'
  | 'users'
  | 'kycSteps'
  | 'kycLogs'
  | 'bankDatas'
  | 'buyRoutes'
  | 'sellRoutes'
  | 'swapRoutes'
  | 'virtualIbans'
  | 'refRewards'
  | 'notifications';

interface TabConfig {
  id: TabType;
  label: string;
  count: number;
}

type FeatureId =
  | 'kycFiles'
  | 'ipLogs'
  | 'filePreview'
  | 'recommendation'
  | 'supportIssues'
  | 'limitRequest'
  | 'transactionActions'
  | 'kycLogsTab';

// Features (panels, actions and tabs) that are hidden for the given role.
// Mirrored on the backend by FIELDS_HIDDEN_BY_ROLE in support.service.ts where applicable
// (data-only features; pure UI actions like 'limitRequest' have no backend counterpart).
const FEATURES_HIDDEN_BY_ROLE: Partial<Record<UserRole, FeatureId[]>> = {
  [UserRole.SUPPORT]: [
    'kycFiles',
    'ipLogs',
    'filePreview',
    'supportIssues',
    'limitRequest',
    'transactionActions',
    'kycLogsTab',
  ],
  [UserRole.MARKETING]: [
    'kycFiles',
    'ipLogs',
    'filePreview',
    'supportIssues',
    'limitRequest',
    'transactionActions',
    'kycLogsTab',
  ],
};

function isFeatureVisible(id: FeatureId, role?: UserRole): boolean {
  return !role || !(FEATURES_HIDDEN_BY_ROLE[role] ?? []).includes(id);
}

export default function ComplianceUserScreen(): JSX.Element {
  useSupportDashboardGuard();
  const { session } = useAuthContext();
  const role = session?.role;

  const { translate } = useSettingsContext();
  const { id: userDataId } = useParams();
  const { getUserData } = useCompliance();
  const { getFile } = useKyc();
  const navigate = useNavigate();

  const [error, setError] = useState<string>();
  const [data, setData] = useState<ComplianceUserData>();
  const [preview, setPreview] = useState<{ url: string; contentType: string; name: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [expandedBankTxId, setExpandedBankTxId] = useState<number>();
  const [expandedCryptoInputId, setExpandedCryptoInputId] = useState<number>();
  const [expandedTxUid, setExpandedTxUid] = useState<string>();

  function handleExpandBankTx(id: number | undefined): void {
    setExpandedBankTxId(id);
    setExpandedCryptoInputId(undefined);
    setExpandedTxUid(undefined);
  }

  function handleExpandCryptoInput(id: number | undefined): void {
    setExpandedCryptoInputId(id);
    setExpandedBankTxId(undefined);
    setExpandedTxUid(undefined);
  }

  function handleExpandTxUid(uid: string | undefined): void {
    setExpandedTxUid(uid);
    setExpandedBankTxId(undefined);
    setExpandedCryptoInputId(undefined);
  }

  async function openFile(file: KycFile): Promise<void> {
    try {
      const { content, contentType } = await getFile(file.uid);
      if (!content || content.type !== 'Buffer' || !Array.isArray(content.data)) {
        setError('Invalid file type');
        return;
      }

      const blob = new Blob([new Uint8Array(content.data)], { type: contentType });
      const url = URL.createObjectURL(blob);

      setPreview({ url, contentType, name: file.name });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading file');
    }
  }

  const loadData = useCallback(() => {
    if (!userDataId) {
      setError('No ID provided');
      return;
    }
    getUserData(+userDataId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'));
  }, [userDataId, getUserData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => preview && URL.revokeObjectURL(preview.url);
  }, [preview]);

  useLayoutOptions({ title: translate('screens/compliance', 'User Data'), backButton: true, noMaxWidth: true });

  const tabs: TabConfig[] = data
    ? [
        { id: 'transactions', label: 'Transactions', count: data.transactions?.length || 0 },
        { id: 'users', label: 'Users', count: data.users?.length || 0 },
        { id: 'kycSteps', label: 'KYC Steps', count: data.kycSteps?.length || 0 },
        ...(isFeatureVisible('kycLogsTab', role)
          ? [{ id: 'kycLogs' as TabType, label: 'KYC Log', count: data.kycLogs?.length || 0 }]
          : []),
        { id: 'bankDatas', label: 'Bank Data', count: data.bankDatas?.length || 0 },
        { id: 'virtualIbans', label: 'Virtual IBANs', count: data.virtualIbans?.length || 0 },
        { id: 'buyRoutes', label: 'Buy Routes', count: data.buyRoutes?.length || 0 },
        { id: 'sellRoutes', label: 'Sell Routes', count: data.sellRoutes?.length || 0 },
        { id: 'swapRoutes', label: 'Swap Routes', count: data.swapRoutes?.length || 0 },
        { id: 'refRewards', label: 'Ref Rewards', count: data.refRewards?.length || 0 },
        { id: 'notifications', label: 'Notifications', count: data.notifications?.length || 0 },
      ]
    : [];

  return (
    <>
      {error && !data ? (
        <ErrorHint message={error} />
      ) : !data ? (
        <StyledLoadingSpinner size={SpinnerSize.LG} />
      ) : (
        <div className="w-full flex flex-col gap-4">
          {/* Top Section: User Data | Middle Panels | File Preview */}
          <div className="flex gap-4 min-h-[400px]">
            <UserDataPanel
              userData={data.userData}
              keyLabel={translate('screens/compliance', 'Key')}
              valueLabel={translate('screens/compliance', 'Value')}
              titleLabel={translate('screens/compliance', 'User Data')}
              userDataId={userDataId ? +userDataId : undefined}
              canRequestLimit={isFeatureVisible('limitRequest', role)}
              onLimitRequestCreated={loadData}
            />

            <div className="w-1/3 min-w-[300px] flex flex-col gap-4">
              <RecommendationPanel kycSteps={data.kycSteps} userDataId={userDataId ?? ''} navigate={navigate} />
              {isFeatureVisible('kycFiles', role) && (
                <KycFilesPanel
                  kycFiles={data.kycFiles}
                  label={translate('screens/compliance', 'KYC Files')}
                  onOpenFile={openFile}
                />
              )}
              {isFeatureVisible('ipLogs', role) && (
                <IpLogsPanel ipLogs={data.ipLogs} userDataId={+(userDataId ?? '0')} />
              )}
              {isFeatureVisible('supportIssues', role) && (
                <SupportIssuesPanel
                  supportIssues={data.supportIssues}
                  userDataId={userDataId ?? ''}
                  navigate={navigate}
                />
              )}
            </div>

            {isFeatureVisible('filePreview', role) && (
              <div className="sticky top-4 self-start">
                <FilePreviewPanel
                  preview={preview}
                  label={translate('screens/compliance', 'File Preview')}
                  onClose={() => setPreview(undefined)}
                />
              </div>
            )}
          </div>

          {/* Bottom Section: Tabs */}
          <div className="w-full">
            <div className="flex border-b border-dfxGray-300">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-dfxBlue-800 border-b-2 border-dfxBlue-800 bg-white'
                      : 'text-dfxGray-700 hover:text-dfxBlue-800 hover:bg-dfxGray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div className="bg-white rounded-b-lg shadow-sm p-4">
              {activeTab === 'transactions' && (
                <TransactionsTable
                  transactions={data.transactions}
                  bankTxs={data.bankTxs}
                  cryptoInputs={data.cryptoInputs}
                  userDataId={+(userDataId ?? '0')}
                  expandedBankTxId={expandedBankTxId}
                  expandedCryptoInputId={expandedCryptoInputId}
                  expandedTxUid={expandedTxUid}
                  canPerformActions={isFeatureVisible('transactionActions', role)}
                  onExpandBankTx={handleExpandBankTx}
                  onExpandCryptoInput={handleExpandCryptoInput}
                  onExpandTxUid={handleExpandTxUid}
                  onStopped={loadData}
                />
              )}

              {activeTab === 'users' && <UsersTable users={data.users} />}
              {activeTab === 'kycSteps' && <KycStepsTable kycSteps={data.kycSteps} />}
              {activeTab === 'kycLogs' && <KycLogsTable kycLogs={data.kycLogs} />}
              {activeTab === 'bankDatas' && <BankDatasTable bankDatas={data.bankDatas} />}
              {activeTab === 'buyRoutes' && <BuyRoutesTable buyRoutes={data.buyRoutes} />}
              {activeTab === 'sellRoutes' && <SellRoutesTable sellRoutes={data.sellRoutes} />}
              {activeTab === 'swapRoutes' && <SwapRoutesTable swapRoutes={data.swapRoutes} />}
              {activeTab === 'virtualIbans' && <VirtualIbansTable virtualIbans={data.virtualIbans} />}
              {activeTab === 'refRewards' && <RefRewardsTable refRewards={data.refRewards} />}
              {activeTab === 'notifications' && <NotificationsTable notifications={data.notifications} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
