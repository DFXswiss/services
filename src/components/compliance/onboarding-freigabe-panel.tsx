import { useEffect, useState } from 'react';
import { KycFile, KycStepInfo } from 'src/hooks/compliance.hook';
import { formatDate, formatValue, statusBadge } from 'src/util/compliance-helpers';

type DecisionValue = '' | 'Akzeptiert' | 'Abgelehnt';

export interface OnboardingFreigabeSaveParams {
  stepId: number;
  status: string;
  result?: string;
  comment?: string;
  userDataUpdate?: Record<string, unknown>;
  pdfData?: {
    finalDecision: string;
    processedBy: string;
    complexOrgStructure?: string;
    highRisk?: string;
    depositLimit?: string;
    amlAccountType?: string;
    commentGmeR?: string;
    reasonSeatingCompany?: string;
    businessActivities?: string;
  };
}

interface OnboardingOnboardingFreigabePanelProps {
  step: KycStepInfo | undefined;
  userData: Record<string, unknown>;
  kycSteps: KycStepInfo[];
  kycFiles: KycFile[];
  onOpenFile: (file: KycFile) => void;
  onSave: (params: OnboardingFreigabeSaveParams) => Promise<void>;
  isSaving: boolean;
}

interface SavedComment {
  complexOrgStructure?: string;
  highRisk?: string;
  depositLimit?: string;
  amlAccountType?: string;
  processedBy?: string;
  finalDecision?: string;
}

function extractField(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (value == null) return '-';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return (obj.name || obj.symbol || obj.displayName || obj.id || '-').toString();
  }
  return value.toString();
}

function findStep(steps: KycStepInfo[], name: string): KycStepInfo | undefined {
  return steps.filter((s) => s.name === name).sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];
}

function parseResult(step: KycStepInfo | undefined): Record<string, unknown> | undefined {
  if (!step?.result) return undefined;
  try {
    return JSON.parse(step.result) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function findFile(files: KycFile[], type?: string, subType?: string, valid?: boolean): KycFile | undefined {
  return files.find(
    (f) =>
      (!type || f.type === type) && (!subType || f.subType === subType) && (valid === undefined || f.valid === valid),
  );
}

function findLatestFile(files: KycFile[], type: string, subType: string): KycFile | undefined {
  return files
    .filter((f) => f.type === type && f.subType === subType)
    .sort((a, b) => {
      // Sort by created date if available, otherwise by id (higher id = newer)
      if (a.created && b.created) {
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      }
      return b.id - a.id;
    })[0];
}

function renderStepResult(result: string | undefined): JSX.Element | null {
  if (!result) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(result);
  } catch {
    return <span className="text-sm text-dfxBlue-800">{result}</span>;
  }

  // Array of {key, value} objects (e.g. FinancialData)
  if (Array.isArray(parsed)) {
    const entries = parsed
      .filter((item): item is { key: string; value: unknown } => item && typeof item.key === 'string')
      .map((item) => ({ label: item.key, value: formatValue(item.value) }));
    if (entries.length > 0) return <InfoTable rows={entries} />;
  }

  // Flat object (e.g. BeneficialOwner)
  if (typeof parsed === 'object' && parsed !== null) {
    const entries = Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
      label: key,
      value: formatValue(value),
    }));
    return <InfoTable rows={entries} />;
  }

  return <span className="text-sm text-dfxBlue-800">{String(parsed)}</span>;
}

function findFileExcludeSubType(files: KycFile[], type: string, excludeSubType: string): KycFile | undefined {
  return files.find((f) => f.type === type && f.subType !== excludeSubType);
}

// --- Sub-components ---

function SectionTitle({ title }: { title: string }): JSX.Element {
  return <div className="text-sm font-bold text-dfxBlue-800 mt-4 mb-1">{title}</div>;
}

function InfoTable({
  rows,
}: {
  rows: { label: string; value: string; isLink?: boolean; href?: string }[];
}): JSX.Element {
  return (
    <table className="w-full">
      <tbody>
        {rows
          .filter((r) => r.label !== '')
          .map((row) => (
            <tr key={row.label}>
              <td className="py-0.5 pr-4 text-left text-sm text-dfxBlue-800 w-56 align-top">{row.label}</td>
              <td className="py-0.5 text-left text-sm text-dfxBlue-800 break-all">
                {row.isLink && row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dfxBlue-300 underline hover:text-dfxBlue-800"
                  >
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function DocLink({
  label,
  file,
  onOpenFile,
  decision,
  onDecisionChange,
}: {
  label: string;
  file: KycFile | undefined;
  onOpenFile: (f: KycFile) => void;
  decision?: DecisionValue;
  onDecisionChange?: (v: DecisionValue) => void;
}): JSX.Element {
  return (
    <tr>
      <td className="py-0.5 pr-4 text-left text-sm text-dfxBlue-800 w-56 align-top">{label}</td>
      <td className="py-0.5 text-left text-sm">
        {file ? (
          <button
            className="text-dfxBlue-300 underline hover:text-dfxBlue-800 transition-colors text-left"
            onClick={() => onOpenFile(file)}
          >
            {file.name}
          </button>
        ) : (
          <span className="text-dfxGray-700">(nicht vorhanden)</span>
        )}
      </td>
      <td className="py-0.5 text-right">
        {onDecisionChange ? (
          <select
            className={`px-2 py-1 text-sm border border-dfxGray-400 rounded ${decision === 'Akzeptiert' ? 'bg-dfxGreen-100/20 text-dfxGreen-100' : decision === 'Abgelehnt' ? 'bg-dfxRed-100/20 text-dfxRed-100' : 'bg-white text-dfxBlue-800'}`}
            value={decision ?? ''}
            onChange={(e) => onDecisionChange(e.target.value as DecisionValue)}
          >
            <option value="">—</option>
            <option value="Akzeptiert">Akzeptiert</option>
            <option value="Abgelehnt">Abgelehnt</option>
          </select>
        ) : decision === 'Akzeptiert' ? (
          <span className="px-2 py-1 text-sm font-medium text-dfxGreen-100">{decision}</span>
        ) : decision === 'Abgelehnt' ? (
          <span className="px-2 py-1 text-sm font-medium text-primary-red">{decision}</span>
        ) : null}
      </td>
    </tr>
  );
}

function DropdownField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <tr>
      <td className="py-1 pr-4 text-left text-sm text-dfxBlue-800 w-56 align-top">{label}</td>
      <td className="py-1" />
      <td className="py-1 text-right">
        <select
          className={`px-2 py-1 text-sm border border-dfxGray-400 rounded ${value === 'Akzeptiert' ? 'bg-dfxGreen-100/20 text-dfxGreen-100' : value === 'Abgelehnt' ? 'bg-dfxRed-100/20 text-dfxRed-100' : 'bg-white text-dfxBlue-800'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
    </tr>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <tr>
      <td className="py-2 pr-4 text-left text-sm text-dfxBlue-800 w-56 align-top whitespace-pre-line">{label}</td>
      <td className="py-2 text-left" colSpan={2}>
        <textarea
          className="w-full px-2 py-1 text-sm border border-dfxGray-400 rounded bg-dfxGray-300/30 text-dfxBlue-800 resize-y"
          rows={3}
          value={value}
          placeholder="n.a."
          onChange={(e) => onChange(e.target.value)}
        />
      </td>
    </tr>
  );
}

// --- Main component ---

export function OnboardingFreigabePanel({
  step,
  userData,
  kycSteps,
  kycFiles,
  onOpenFile,
  onSave,
  isSaving,
}: OnboardingOnboardingFreigabePanelProps): JSX.Element {
  // Derived from predecessor step status (read-only, like in GS)
  const ownerDirectoryStep = findStep(kycSteps, 'OwnerDirectory');
  const legalEntityStepForDecision = findStep(kycSteps, 'LegalEntity');
  const authorityStepForDecision = findStep(kycSteps, 'Authority');

  function stepToDecision(s: KycStepInfo | undefined): DecisionValue {
    if (!s) return '';
    if (s.status === 'Completed') return 'Akzeptiert';
    if (s.status === 'Failed') return 'Abgelehnt';
    return '';
  }

  const stockRegisterDecision = stepToDecision(ownerDirectoryStep);
  const commercialRegisterDecision = stepToDecision(legalEntityStepForDecision);
  const authorityDecision = stepToDecision(authorityStepForDecision);

  const [complexOrgStructure, setComplexOrgStructure] = useState('');
  const [highRisk, setHighRisk] = useState('');
  const [depositLimit, setDepositLimit] = useState('');
  const [amlAccountType, setAmlAccountType] = useState('');
  const [commentGmeR, setCommentGmeR] = useState('');
  const [reasonSeatingCompany, setReasonSeatingCompany] = useState('');
  const [businessActivities, setBusinessActivities] = useState('');
  const [finalDecision, setFinalDecision] = useState<DecisionValue>('');
  const [processedBy, setProcessedBy] = useState('');

  // Load saved state from result.complianceReview and result text fields
  useEffect(() => {
    if (!step) return;

    if (step.result) {
      try {
        const parsed = JSON.parse(step.result) as Record<string, unknown>;

        // Restore text fields
        if (parsed.CommentGmeR) setCommentGmeR(String(parsed.CommentGmeR));
        if (parsed.ReasonSeatingCompany) setReasonSeatingCompany(String(parsed.ReasonSeatingCompany));
        if (parsed.BusinessActivities) setBusinessActivities(String(parsed.BusinessActivities));

        // Restore decisions from complianceReview
        const saved = parsed.complianceReview as SavedComment | undefined;
        if (saved && typeof saved === 'object') {
          if (saved.complexOrgStructure) setComplexOrgStructure(saved.complexOrgStructure);
          if (saved.highRisk) setHighRisk(saved.highRisk);
          if (saved.depositLimit) setDepositLimit(saved.depositLimit);
          if (saved.amlAccountType) setAmlAccountType(saved.amlAccountType);
          if (saved.processedBy) setProcessedBy(saved.processedBy);
          if (saved.finalDecision) setFinalDecision(saved.finalDecision as DecisionValue);
        }
      } catch {
        // ignore
      }
    }
  }, [step]);

  if (!step) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-dfxGray-700">
        Kein DfxApproval-Step vorhanden.
      </div>
    );
  }

  const accountType = extractField(userData, 'accountType');
  const isOrganization = accountType === 'Organization';
  const legalEntityStep = findStep(kycSteps, 'LegalEntity');
  const legalEntityResult = parseResult(legalEntityStep);
  const legalEntity = legalEntityResult?.legalEntity ? String(legalEntityResult.legalEntity) : '';
  const isGmbH = legalEntity === 'GmbH';

  const kycHash = extractField(userData, 'kycHash');
  const financialDataStep = findStep(kycSteps, 'FinancialData');
  const beneficialOwnerStep = findStep(kycSteps, 'BeneficialOwner');
  const signatoryPowerStep = findStep(kycSteps, 'SignatoryPower');
  const operationalActivityStep = findStep(kycSteps, 'OperationalActivity');
  const operationalActivityResult = parseResult(operationalActivityStep);

  function buildAddress(prefix: string): string {
    const street = extractField(userData, `${prefix}Street`);
    const houseNr = extractField(userData, `${prefix}HouseNumber`);
    const zip = extractField(userData, `${prefix}Zip`);
    const location = extractField(userData, `${prefix}Location`);
    const country = extractField(userData, `${prefix}Country`);
    const parts = [`${street} ${houseNr}`.trim(), `${zip} ${location}`.trim(), country]
      .filter((p) => p && p !== '-')
      .join(', ');
    return parts || '-';
  }

  async function handleSave(): Promise<void> {
    if (!step || !finalDecision) return;

    const status = finalDecision === 'Akzeptiert' ? 'Completed' : 'Failed';

    // Comment: plain text for GS compatibility
    const comment = finalDecision === 'Abgelehnt' ? 'Blocked' : undefined;

    // Result: merge text fields + complianceReview into existing result
    let existingResult: Record<string, unknown> = {};
    if (step.result) {
      try {
        existingResult = JSON.parse(step.result) as Record<string, unknown>;
      } catch {
        // keep empty
      }
    }

    if (commentGmeR) existingResult.CommentGmeR = commentGmeR;
    if (reasonSeatingCompany) existingResult.ReasonSeatingCompany = reasonSeatingCompany;
    if (businessActivities) existingResult.BusinessActivities = businessActivities;

    existingResult.complianceReview = {
      complexOrgStructure: complexOrgStructure || undefined,
      highRisk: highRisk || undefined,
      depositLimit: depositLimit || undefined,
      amlAccountType: amlAccountType || undefined,
      processedBy: processedBy || undefined,
      finalDecision: finalDecision || undefined,
    } as SavedComment;

    const result = JSON.stringify(existingResult);

    const userDataUpdate: Record<string, unknown> = {};
    if (complexOrgStructure) userDataUpdate.complexOrgStructure = complexOrgStructure === 'Ja';
    if (highRisk) userDataUpdate.highRisk = highRisk === 'Ja';
    if (depositLimit) userDataUpdate.depositLimit = parseInt(depositLimit);
    if (amlAccountType) userDataUpdate.amlAccountType = amlAccountType;

    await onSave({
      stepId: step.id,
      status,
      result,
      comment,
      userDataUpdate: Object.keys(userDataUpdate).length > 0 ? userDataUpdate : undefined,
      pdfData: {
        finalDecision,
        processedBy,
        complexOrgStructure: complexOrgStructure || undefined,
        highRisk: highRisk || undefined,
        depositLimit: depositLimit || undefined,
        amlAccountType: amlAccountType || undefined,
        commentGmeR: commentGmeR || undefined,
        reasonSeatingCompany: reasonSeatingCompany || undefined,
        businessActivities: businessActivities || undefined,
      },
    });
  }

  // --- User info rows ---
  const userInfoRows = [
    { label: 'UserDataId', value: extractField(userData, 'id') },
    { label: 'Account Type', value: accountType },
    {
      label: 'Name Kontoeröffner',
      value:
        [extractField(userData, 'firstname'), extractField(userData, 'surname')].filter((v) => v !== '-').join(' ') ||
        '-',
    },
    ...(isOrganization ? [{ label: 'Name Vertragspartei', value: extractField(userData, 'organizationName') }] : []),
    { label: 'Privat-Adresse', value: buildAddress('') },
    ...(isOrganization ? [{ label: 'Firmen-Adresse', value: buildAddress('organization') }] : []),
    { label: 'Geburtstag', value: userData['birthday'] ? formatDate(String(userData['birthday'])) : '-' },
    { label: 'Mail', value: extractField(userData, 'mail') },
    { label: 'Phone', value: extractField(userData, 'phone') },
    { label: 'Sprache', value: extractField(userData, 'language') },
    { label: 'Nationalität', value: extractField(userData, 'nationality') },
    { label: 'lastNameCheckDate', value: extractField(userData, 'lastNameCheckDate') },
    { label: 'PEP', value: extractField(userData, 'pep') },
    { label: 'HighRisk', value: extractField(userData, 'highRisk') },
    { label: 'identDocumentId', value: extractField(userData, 'identDocumentId') },
    { label: 'identificationType', value: extractField(userData, 'identificationType') },
    { label: 'identDocumentType', value: extractField(userData, 'identDocumentType') },
    {
      label: 'kycHash',
      value: kycHash !== '-' ? kycHash : '-',
      isLink: kycHash !== '-',
      href: kycHash !== '-' ? `/kyc?code=${kycHash}` : undefined,
    },
    ...(isOrganization
      ? [{ label: 'accountOpenerAuthorization', value: extractField(userData, 'accountOpenerAuthorization') }]
      : []),
  ];

  // --- Document files ---
  const deckblatt = findFile(kycFiles, 'UserNotes', 'GwGFileCover');
  const identDoc = findFile(kycFiles, 'Identification', undefined, true);
  const identForm = findFile(kycFiles, 'UserNotes', 'IdentificationForm');
  const riskProfile = findFile(kycFiles, 'UserNotes', 'RiskProfile');
  const formAK = kycFiles.find((f) => f.subType === 'FormA' || f.subType === 'FormK');
  const nameCheckDfx = findFile(kycFiles, 'UserNotes', 'DfxNameCheck');
  const nameCheckPersonal = findFileExcludeSubType(kycFiles, 'NameCheck', 'BusinessNameCheck');
  const nameCheckBusiness = findFile(kycFiles, 'NameCheck', 'BusinessNameCheck');
  const stockRegisterFile = kycFiles.find((f) => f.type === 'StockRegister');
  const commercialRegisterFile = kycFiles.find((f) => f.type === 'CommercialRegister');
  const authorityFile = kycFiles.find((f) => f.type === 'Authority');
  const onboardingReportFile = findLatestFile(kycFiles, 'UserNotes', 'OnboardingReport');

  const signatoryPowerResult = parseResult(signatoryPowerStep);

  return (
    <div className="flex flex-col gap-2">
      {/* Title */}
      <h2 className="text-xl font-bold text-dfxBlue-800 mb-2">GwG Kunden Onboarding</h2>

      {/* Status */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm text-dfxGray-700 font-medium">Status:</span>
        {statusBadge(step.status)}
      </div>

      {/* Section 1: User Data */}
      <SectionTitle title="User Daten:" />
      <InfoTable rows={userInfoRows} />

      {/* Section 3: FinancialData */}
      {financialDataStep?.result && (
        <>
          <SectionTitle title="FinancialData:" />
          {renderStepResult(financialDataStep.result)}
        </>
      )}

      {/* Section 4: BeneficialOwners */}
      {beneficialOwnerStep?.result && (
        <>
          <SectionTitle title="BeneficialOwners:" />
          {renderStepResult(beneficialOwnerStep.result)}
        </>
      )}

      {/* Section 5: Step Results (only Organization) */}
      {isOrganization && (
        <>
          <InfoTable
            rows={[
              { label: 'Legal Entity', value: legalEntity || '-' },
              {
                label: 'SignatoryPower',
                value: signatoryPowerResult?.signatoryPower ? String(signatoryPowerResult.signatoryPower) : '-',
              },
              {
                label: 'OperationalActivity',
                value:
                  operationalActivityResult?.isOperational != null
                    ? String(operationalActivityResult.isOperational)
                    : '-',
              },
              {
                label: 'WebsiteUrl',
                value: operationalActivityResult?.websiteUrl ? String(operationalActivityResult.websiteUrl) : '-',
                isLink: !!operationalActivityResult?.websiteUrl,
                href: operationalActivityResult?.websiteUrl ? String(operationalActivityResult.websiteUrl) : undefined,
              },
            ]}
          />
        </>
      )}

      {/* Documents + Decisions + Footer — one table for consistent column alignment */}
      <table className="w-full mt-4">
        <colgroup>
          <col style={{ width: '220px' }} />
          <col />
          <col style={{ width: '180px' }} />
        </colgroup>
        <tbody>
          {/* Section 6: Documents */}
          <DocLink label="Deckblatt" file={deckblatt} onOpenFile={onOpenFile} />
          <DocLink label="Identifikationsdokument" file={identDoc} onOpenFile={onOpenFile} />
          <DocLink label="Identifizierungsformular" file={identForm} onOpenFile={onOpenFile} />
          <DocLink label="Risikoprofil" file={riskProfile} onOpenFile={onOpenFile} />
          <DocLink label="Formular A oder K" file={formAK} onOpenFile={onOpenFile} />
          <DocLink label="Name Check DFX" file={nameCheckDfx} onOpenFile={onOpenFile} />
          <DocLink label="Name Check Dilisense Personal" file={nameCheckPersonal} onOpenFile={onOpenFile} />
          {isOrganization && (
            <DocLink label="Name Check Dilisense Business" file={nameCheckBusiness} onOpenFile={onOpenFile} />
          )}
          {isOrganization && (
            <DocLink
              label="Entscheid zum Handelsregisterauszug:"
              file={commercialRegisterFile}
              onOpenFile={onOpenFile}
              decision={commercialRegisterDecision}
            />
          )}
          {isOrganization && (
            <DocLink
              label="Entscheid zur Vollmacht:"
              file={authorityFile}
              onOpenFile={onOpenFile}
              decision={authorityDecision}
            />
          )}
          {isOrganization && !isGmbH && (
            <DocLink
              label="Entscheid zum Aktienbuch:"
              file={stockRegisterFile}
              onOpenFile={onOpenFile}
              decision={stockRegisterDecision}
            />
          )}

          {/* Onboarding Report PDF */}
          <DocLink label="Onboarding Report PDF:" file={onboardingReportFile} onOpenFile={onOpenFile} />

          {/* Spacer */}
          <tr>
            <td className="py-3" colSpan={3} />
          </tr>

          {/* Section 7: Decision Fields */}
          <DropdownField
            label="Complex organization structure:"
            value={complexOrgStructure}
            options={[
              { value: 'Ja', label: 'Ja' },
              { value: 'Nein', label: 'Nein' },
            ]}
            onChange={setComplexOrgStructure}
          />
          <DropdownField
            label='Risiko Einstufung als "Geschäftsbeziehung mit erhöhtem Risiko":'
            value={highRisk}
            options={[
              { value: 'Ja', label: 'Ja' },
              { value: 'Nein', label: 'Nein' },
            ]}
            onChange={setHighRisk}
          />
          <DropdownField
            label="depositLimit in CHF:"
            value={depositLimit}
            options={[
              { value: '100000', label: "100'000" },
              { value: '500000', label: '500000' },
            ]}
            onChange={setDepositLimit}
          />
          <DropdownField
            label="amlAccountType:"
            value={amlAccountType}
            options={[
              { value: 'operativ tätige Gesellschaft', label: 'operativ tätige Gesellschaft' },
              { value: 'Sitzgesellschaft', label: 'Sitzgesellschaft' },
              { value: 'Einzelunternehmen', label: 'Einzelunternehmen' },
              { value: 'Stiftung', label: 'Stiftung' },
              { value: 'Verein', label: 'Verein' },
              { value: 'natural person', label: 'natural person' },
            ]}
            onChange={setAmlAccountType}
          />
          <TextareaField
            label="Wenn GmeR:
Kommentar für die Aufnahme"
            value={commentGmeR}
            onChange={setCommentGmeR}
          />
          <TextareaField
            label="Wenn Sitzgesellschaft:
Gründe für die Verwendung einer Sitzgesellschaften"
            value={reasonSeatingCompany}
            onChange={setReasonSeatingCompany}
          />
          <TextareaField
            label="Bei Einzelunternehmen und Organisationen:
Beschreibung der Geschäftlichen Aktivitäten"
            value={businessActivities}
            onChange={setBusinessActivities}
          />

          {/* Spacer */}
          <tr>
            <td className="py-3" colSpan={3} />
          </tr>

          {/* Final Decision */}
          <DropdownField
            label="Finaler Entscheid:"
            value={finalDecision}
            options={[
              { value: 'Akzeptiert', label: 'Akzeptiert' },
              { value: 'Abgelehnt', label: 'Abgelehnt' },
            ]}
            onChange={(v) => setFinalDecision(v as DecisionValue)}
          />

          {/* Spacer */}
          <tr>
            <td className="py-3" colSpan={3} />
          </tr>

          {/* UTC Date + Processed by */}
          <tr>
            <td className="py-1 pr-4 text-left text-sm text-dfxBlue-800">UTC Datum:</td>
            <td className="py-1 text-left text-sm text-dfxBlue-800" colSpan={2}>
              {new Date().toLocaleDateString('de-CH')} {new Date().toLocaleTimeString('de-CH')}
            </td>
          </tr>
          <DropdownField
            label="Bearbeitet von:"
            value={processedBy}
            options={[
              { value: 'Vesa Rasaj', label: 'Vesa Rasaj' },
              { value: 'Cyrill Thommen', label: 'Cyrill Thommen' },
            ]}
            onChange={setProcessedBy}
          />
        </tbody>
      </table>

      {/* Save */}
      <div className="mt-4">
        <button
          className="px-4 py-2 text-sm text-white bg-dfxBlue-800 hover:bg-dfxBlue-800/80 rounded-lg transition-colors disabled:opacity-50"
          onClick={handleSave}
          disabled={isSaving || !finalDecision || !processedBy}
        >
          {isSaving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
