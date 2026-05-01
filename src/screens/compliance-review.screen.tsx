import { useKyc } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ComplianceReviewHeader } from 'src/components/compliance/compliance-review-header';
import {
  ComplianceReviewFreigabePanel,
  ComplianceReviewFreigabeSaveParams,
} from 'src/components/compliance/freigabe-panel';
import { ComplianceReviewPanel } from 'src/components/compliance/compliance-review-panel';
import { ReviewCheckTab, ReviewTabConfig, reviewTabs } from 'src/components/compliance/compliance-review-configs';
import { FilePreviewPanel } from 'src/components/compliance/file-preview-panel';
import { StammdatenPanel } from 'src/components/compliance/stammdaten-panel';
import { BankDataReviewPanel } from 'src/components/compliance/bank-data-panel';
import { AmlCheckPendingPanel } from 'src/components/compliance/aml-check-panel';
import { IdentPanel } from 'src/components/compliance/ident-panel';
import { ErrorHint } from 'src/components/error-hint';
import { ComplianceUserData, KycFile, KycStepInfo, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useSplitPane } from 'src/hooks/split-pane.hook';

function findLatestStep(kycSteps: KycStepInfo[], stepName: string): KycStepInfo | undefined {
  return kycSteps.filter((s) => s.name === stepName).sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];
}

function findFiles(kycFiles: KycFile[], fileTypes: string[]): KycFile[] {
  return kycFiles.filter((f) => fileTypes.includes(f.type));
}

export default function ComplianceReviewScreen(): JSX.Element {
  useComplianceGuard();

  const { id: userDataId } = useParams();
  const navigateTo = useNavigate();
  const onBack = useCallback(() => navigateTo('/compliance'), [navigateTo]);

  useLayoutOptions({ title: 'KYC Management', backButton: true, noMaxWidth: true, onBack });
  const {
    getUserData,
    updateKycStep,
    updateUserData,
    updateBankData,
    updateBuyCrypto,
    updateBuyFiat,
    resetBuyCryptoAml,
    resetBuyFiatAml,
    generateOnboardingPdf,
  } = useCompliance();
  const { getFile } = useKyc();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<ComplianceUserData>();
  const [activeTab, setActiveTab] = useState<ReviewCheckTab | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<{ url: string; contentType: string; name: string }>();
  const { containerRef, splitPercent, handleSplitDrag } = useSplitPane();

  const loadData = useCallback(() => {
    if (!userDataId) {
      setError('No ID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(undefined);
    getUserData(+userDataId)
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [userDataId, getUserData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

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

  function deriveAmlAccountType(step: KycStepInfo | undefined): string | undefined {
    if (!step?.result) return undefined;
    try {
      const parsed = JSON.parse(step.result) as Record<string, unknown>;
      if (parsed.isOperational === true) return 'operativ tätige Gesellschaft';
    } catch {
      // ignore parse errors
    }
    return undefined;
  }

  async function handleFreigabeSave(params: ComplianceReviewFreigabeSaveParams): Promise<void> {
    setIsSaving(true);
    setError(undefined);
    try {
      // 1. Save KycStep
      await updateKycStep(params.stepId, {
        status: params.status,
        result: params.result,
        comment: params.comment,
      });

      // 2. Update UserData if needed
      if (params.userDataUpdate && userDataId) {
        await updateUserData(+userDataId, params.userDataUpdate);
      }

      // 3. Generate PDF if data provided
      if (params.pdfData && userDataId) {
        try {
          const { pdfData, fileName } = await generateOnboardingPdf(+userDataId, params.pdfData);

          // Show PDF in preview
          const byteCharacters = atob(pdfData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreview({ url, contentType: 'application/pdf', name: fileName });
        } catch (e) {
          console.error('Failed to generate PDF:', e);
        }
      }

      // 4. Reload data (now includes the new PDF)
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave(stepId: number, status: string, comment?: string, result?: string): Promise<void> {
    setIsSaving(true);
    setError(undefined);
    try {
      await updateKycStep(stepId, { status, comment, result });

      if (effectiveTab === 'operationalActivity' && userDataId) {
        const step = findLatestStep(data?.kycSteps ?? [], 'OperationalActivity');
        const amlAccountType = deriveAmlAccountType(step);
        if (amlAccountType) {
          await updateUserData(+userDataId, { amlAccountType });
        }
      }

      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBankDataApprove(bankDataId: number): Promise<void> {
    setIsSaving(true);
    setError(undefined);
    try {
      await updateBankData(bankDataId, { manualApproved: true, approved: true, status: 'Completed' });
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error approving');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBankDataReject(bankDataId: number): Promise<void> {
    setIsSaving(true);
    setError(undefined);
    try {
      await updateBankData(bankDataId, { manualApproved: false, approved: false, status: 'Failed' });
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error rejecting');
    } finally {
      setIsSaving(false);
    }
  }

  function getTabBadge(tab: ReviewTabConfig): JSX.Element | null {
    if (tab.key === 'bankDataReview') {
      const count = data?.bankDatas.filter((b) => !b.approved || b.status === 'ManualReview').length ?? 0;
      return count > 0 ? (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500 text-white">{count}</span>
      ) : null;
    }
    if (tab.key === 'amlPending') {
      const count =
        data?.transactions.filter(
          (tx) => tx.type != null && tx.amlCheck === 'Pending' && tx.amlReason === 'ManualCheck',
        ).length ?? 0;
      return count > 0 ? (
        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-yellow-500 text-white">{count}</span>
      ) : null;
    }
    if (tab.key === 'stammdaten') {
      const changeSteps = ['NameChange', 'AddressChange'];
      const hasChanges = data?.kycSteps.some(
        (s) => changeSteps.includes(s.name) && !['Completed', 'Failed'].includes(s.status),
      );
      return hasChanges ? <span className="ml-1 inline-block w-2 h-2 rounded-full bg-yellow-500" /> : null;
    }
    // KYC step-based tabs
    if (tab.stepName) {
      const step = findLatestStep(data?.kycSteps ?? [], tab.stepName);
      return step ? (
        <span
          className={`ml-1 inline-block w-2 h-2 rounded-full ${
            step.status === 'Completed' ? 'bg-green-500' : step.status === 'Failed' ? 'bg-red-500' : 'bg-yellow-500'
          }`}
        />
      ) : null;
    }
    return null;
  }

  function getTabColor(tab: ReviewTabConfig): string {
    const green = 'bg-dfxGreen-100/20 text-dfxGreen-100 hover:bg-dfxGreen-100/30';
    const red = 'bg-dfxRed-100/20 text-dfxRed-100 hover:bg-dfxRed-100/30';
    const gray = 'bg-dfxGray-300 text-dfxGray-700 hover:bg-dfxGray-400';

    if (tab.key === 'stammdaten') {
      const changeSteps = ['NameChange', 'AddressChange'];
      const steps = data?.kycSteps.filter((s) => changeSteps.includes(s.name)) ?? [];
      if (steps.length === 0) return gray;
      if (steps.some((s) => s.status === 'Failed')) return red;
      if (steps.every((s) => s.status === 'Completed')) return green;
      return gray;
    }

    if (tab.key === 'bankDataReview') {
      const entries = data?.bankDatas ?? [];
      if (entries.some((b) => b.status === 'Failed')) return red;
      const pending = entries.filter((b) => !b.approved || b.status === 'ManualReview');
      if (entries.length > 0 && pending.length === 0) return green;
      return gray;
    }

    if (tab.key === 'amlPending') {
      const txs = data?.transactions.filter((tx) => tx.type != null && tx.amlReason === 'ManualCheck') ?? [];
      if (txs.some((tx) => tx.amlCheck === 'Fail')) return red;
      const hasPending = txs.some((tx) => tx.amlCheck === 'Pending');
      if (txs.length > 0 && !hasPending) return green;
      return gray;
    }

    if (tab.stepName) {
      const step = findLatestStep(data?.kycSteps ?? [], tab.stepName);
      if (step?.status === 'Completed') return green;
      if (step?.status === 'Failed') return red;
    }

    return gray;
  }

  if (isLoading && !data) return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  if (error && !data) return <ErrorHint message={error} />;
  if (!data) return <ErrorHint message="No data" />;

  const accountType = String(data.userData.accountType ?? '');
  const visibleTabs = reviewTabs.filter((t) => !t.accountTypes || t.accountTypes.includes(accountType));

  const effectiveTab = activeTab && visibleTabs.some((t) => t.key === activeTab) ? activeTab : visibleTabs[0]?.key;
  if (effectiveTab && effectiveTab !== activeTab) setActiveTab(effectiveTab);

  const activeConfig = visibleTabs.find((t) => t.key === effectiveTab) ?? visibleTabs[0];

  return (
    <div className="w-full flex flex-col gap-4">
      {error && <ErrorHint message={error} />}

      <div ref={containerRef} className="flex">
        {/* Left: Header + Tabs */}
        <div style={{ width: `${splitPercent}%` }} className="flex flex-col gap-4 min-w-0 pr-2">
          <ComplianceReviewHeader userData={data.userData} kycSteps={data.kycSteps} />

          {/* Tab Bar */}
          <div className="flex flex-wrap gap-1">
            {visibleTabs.map((tab, index) => {
              const prevTab = index > 0 ? visibleTabs[index - 1] : null;
              const showSeparator = prevTab && prevTab.group !== tab.group;

              return (
                <Fragment key={tab.key}>
                  {showSeparator && <div className="w-px bg-dfxGray-400 mx-1 h-8 self-center" />}
                  <button
                    className={`px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                      effectiveTab === tab.key
                        ? 'bg-white text-dfxBlue-800 border-b-2 border-dfxBlue-800'
                        : getTabColor(tab)
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                    {getTabBadge(tab)}
                  </button>
                </Fragment>
              );
            })}
          </div>

          {/* Active Panel */}
          {effectiveTab === 'freigabe' ? (
            <ComplianceReviewFreigabePanel
              step={findLatestStep(data.kycSteps, 'DfxApproval')}
              userData={data.userData}
              kycSteps={data.kycSteps}
              kycFiles={data.kycFiles ?? []}
              onOpenFile={openFile}
              onSave={handleFreigabeSave}
              isSaving={isSaving}
            />
          ) : effectiveTab === 'stammdaten' ? (
            <StammdatenPanel data={data} onOpenFile={openFile} onSave={handleSave} isSaving={isSaving} />
          ) : effectiveTab === 'ident' ? (
            <IdentPanel data={data} onOpenFile={openFile} onSave={handleSave} isSaving={isSaving} />
          ) : effectiveTab === 'bankDataReview' ? (
            <BankDataReviewPanel
              bankDatas={data.bankDatas}
              userData={data.userData}
              onApprove={handleBankDataApprove}
              onReject={handleBankDataReject}
              isSaving={isSaving}
            />
          ) : effectiveTab === 'amlPending' ? (
            <AmlCheckPendingPanel
              data={data}
              onUpdateBuyCrypto={updateBuyCrypto}
              onUpdateBuyFiat={updateBuyFiat}
              onResetBuyCryptoAml={resetBuyCryptoAml}
              onResetBuyFiatAml={resetBuyFiatAml}
              isSaving={isSaving}
              onReload={loadData}
            />
          ) : (
            <ComplianceReviewPanel
              step={findLatestStep(data.kycSteps, activeConfig.stepName)}
              files={findFiles(data.kycFiles ?? [], activeConfig.fileTypes)}
              allFiles={data.kycFiles ?? []}
              checkItems={activeConfig.checkItems}
              showResult={activeConfig.showResult}
              decisionLabel={activeConfig.decisionLabel}
              rejectionReasons={activeConfig.rejectionReasons}
              userData={data.userData}
              onOpenFile={openFile}
              onSave={handleSave}
              isSaving={isSaving}
            />
          )}
        </div>

        {/* Draggable Splitter */}
        <div className="w-1.5 cursor-col-resize flex-shrink-0 group flex items-stretch" onMouseDown={handleSplitDrag}>
          <div className="w-0.5 mx-auto bg-dfxGray-400 group-hover:bg-dfxBlue-400 transition-colors rounded-full" />
        </div>

        {/* Right: File Preview */}
        <div style={{ width: `${100 - splitPercent}%` }} className="min-w-0 sticky top-4 self-start pl-2">
          <FilePreviewPanel preview={preview} label="File Preview" onClose={() => setPreview(undefined)} />
        </div>
      </div>
    </div>
  );
}
