import { useKyc } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BankDatasTable,
  BuyRoutesTable,
  KycLogsTable,
  KycStepsTable,
  SellRoutesTable,
  UsersTable,
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
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

type TabType = 'transactions' | 'users' | 'kycSteps' | 'kycLogs' | 'bankDatas' | 'buyRoutes' | 'sellRoutes';

interface TabConfig {
  id: TabType;
  label: string;
  count: number;
}

export default function ComplianceUserScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id: userDataId } = useParams();
  const { getUserData } = useCompliance();
  const { getFile } = useKyc();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    if (userDataId) {
      setIsLoading(true);
      getUserData(+userDataId)
        .then((d) => !cancelled && setData(d))
        .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Unknown error'))
        .finally(() => !cancelled && setIsLoading(false));
    } else {
      setError('No ID provided');
    }
    return () => {
      cancelled = true;
    };
  }, [userDataId]);

  useEffect(() => {
    return () => preview && URL.revokeObjectURL(preview.url);
  }, [preview]);

  useLayoutOptions({ title: translate('screens/compliance', 'User Data'), backButton: true, noMaxWidth: true });

  const tabs: TabConfig[] = data
    ? [
        { id: 'transactions', label: 'Transactions', count: data.transactions?.length || 0 },
        { id: 'users', label: 'Users', count: data.users?.length || 0 },
        { id: 'kycSteps', label: 'KYC Steps', count: data.kycSteps?.length || 0 },
        { id: 'kycLogs', label: 'KYC Log', count: data.kycLogs?.length || 0 },
        { id: 'bankDatas', label: 'Bank Data', count: data.bankDatas?.length || 0 },
        { id: 'buyRoutes', label: 'Buy Routes', count: data.buyRoutes?.length || 0 },
        { id: 'sellRoutes', label: 'Sell Routes', count: data.sellRoutes?.length || 0 },
      ]
    : [];

  return (
    <>
      {error ? (
        <ErrorHint message={error} />
      ) : isLoading || !data ? (
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
            />

            <div className="w-1/3 min-w-[300px] flex flex-col gap-4">
              <RecommendationPanel kycSteps={data.kycSteps} userDataId={userDataId ?? ''} navigate={navigate} />
              <KycFilesPanel
                kycFiles={data.kycFiles}
                label={translate('screens/compliance', 'KYC Files')}
                onOpenFile={openFile}
              />
              <IpLogsPanel ipLogs={data.ipLogs} userDataId={+(userDataId ?? '0')} />
              <SupportIssuesPanel
                supportIssues={data.supportIssues}
                userDataId={userDataId ?? ''}
                navigate={navigate}
              />
            </div>

            <FilePreviewPanel
              preview={preview}
              label={translate('screens/compliance', 'File Preview')}
              onClose={() => setPreview(undefined)}
            />
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
                  expandedBankTxId={expandedBankTxId}
                  expandedCryptoInputId={expandedCryptoInputId}
                  expandedTxUid={expandedTxUid}
                  onExpandBankTx={handleExpandBankTx}
                  onExpandCryptoInput={handleExpandCryptoInput}
                  onExpandTxUid={handleExpandTxUid}
                />
              )}

              {activeTab === 'users' && <UsersTable users={data.users} />}
              {activeTab === 'kycSteps' && <KycStepsTable kycSteps={data.kycSteps} />}
              {activeTab === 'kycLogs' && (
                <KycLogsTable kycLogs={data.kycLogs.filter((l) => l.type !== 'KycFileLog')} />
              )}
              {activeTab === 'bankDatas' && <BankDatasTable bankDatas={data.bankDatas} />}
              {activeTab === 'buyRoutes' && <BuyRoutesTable buyRoutes={data.buyRoutes} />}
              {activeTab === 'sellRoutes' && <SellRoutesTable sellRoutes={data.sellRoutes} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
