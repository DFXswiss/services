import { useKyc } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OnboardingCompanyHeader } from 'src/components/compliance/onboarding-company-header';
import {
  OnboardingFreigabePanel,
  OnboardingFreigabeSaveParams,
} from 'src/components/compliance/onboarding-freigabe-panel';
import { OnboardingCheckPanel } from 'src/components/compliance/onboarding-check-panel';
import {
  OnboardingCheckTab,
  OnboardingTabConfig,
  onboardingTabs,
} from 'src/components/compliance/onboarding-check-configs';
import { FilePreviewPanel } from 'src/components/compliance/file-preview-panel';
import { ErrorHint } from 'src/components/error-hint';
import { ComplianceUserData, KycFile, KycStepInfo, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

function findLatestStep(kycSteps: KycStepInfo[], stepName: string): KycStepInfo | undefined {
  return kycSteps.filter((s) => s.name === stepName).sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];
}

function findFiles(kycFiles: KycFile[], fileTypes: string[]): KycFile[] {
  return kycFiles.filter((f) => fileTypes.includes(f.type));
}

export default function ComplianceCompanyOnboardingScreen(): JSX.Element {
  useComplianceGuard();

  const { id: userDataId } = useParams();
  const navigateTo = useNavigate();
  const onBack = useCallback(() => navigateTo('/compliance'), [navigateTo]);

  useLayoutOptions({ title: 'Company Onboarding Review', backButton: true, noMaxWidth: true, onBack });
  const { getUserData, updateKycStep, updateUserData, generateOnboardingPdf } = useCompliance();
  const { getFile } = useKyc();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<ComplianceUserData>();
  const [activeTab, setActiveTab] = useState<OnboardingCheckTab>('legalEntity');
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<{ url: string; contentType: string; name: string }>();

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

  async function handleFreigabeSave(params: OnboardingFreigabeSaveParams): Promise<void> {
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

      if (activeTab === 'operationalActivity' && userDataId) {
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

  if (isLoading && !data) return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  if (error && !data) return <ErrorHint message={error} />;
  if (!data) return <ErrorHint message="No data" />;

  const activeConfig = onboardingTabs.find((t) => t.key === activeTab) as OnboardingTabConfig;

  return (
    <div className="w-full flex flex-col gap-4">
      {error && <ErrorHint message={error} />}

      <div className="flex gap-4">
        {/* Left: Header + Tabs */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <OnboardingCompanyHeader userData={data.userData} kycSteps={data.kycSteps} />

          {/* Tab Bar */}
          <div className="flex gap-1 overflow-x-auto">
            {onboardingTabs.map((tab) => {
              const step = findLatestStep(data.kycSteps, tab.stepName);
              return (
                <button
                  key={tab.key}
                  className={`px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.key
                      ? 'bg-white text-dfxBlue-800 border-b-2 border-dfxBlue-800'
                      : 'bg-dfxGray-300 text-dfxGray-700 hover:bg-dfxGray-400'
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {step && (
                    <span
                      className={`ml-1 inline-block w-2 h-2 rounded-full ${
                        step.status === 'Completed'
                          ? 'bg-green-500'
                          : step.status === 'Failed'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Check Panel */}
          {activeTab === 'onboardingFreigabe' ? (
            <OnboardingFreigabePanel
              step={findLatestStep(data.kycSteps, 'DfxApproval')}
              userData={data.userData}
              kycSteps={data.kycSteps}
              kycFiles={data.kycFiles}
              onOpenFile={openFile}
              onSave={handleFreigabeSave}
              isSaving={isSaving}
              onLimitRequestCreated={loadData}
            />
          ) : (
            <OnboardingCheckPanel
              step={findLatestStep(data.kycSteps, activeConfig.stepName)}
              files={findFiles(data.kycFiles, activeConfig.fileTypes)}
              allFiles={data.kycFiles}
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

        {/* Right: File Preview */}
        <div className="w-[500px] shrink-0 sticky top-4 self-start">
          <FilePreviewPanel preview={preview} label="File Preview" onClose={() => setPreview(undefined)} />
        </div>
      </div>
    </div>
  );
}
