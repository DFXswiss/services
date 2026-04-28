import { Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ComplianceUserData, TransactionInfo } from 'src/hooks/compliance.hook';
import { DEFAULT_MROS_INDICATOR_CODES, MrosListEntry, MrosPersonOverrides, MrosStatus } from 'src/dto/mros.dto';
import { useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { DetailRow, formatDateTime, mrosStatusBadge } from 'src/util/compliance-helpers';

interface FormData {
  status: MrosStatus;
  submissionDate: string;
  authorityReference: string;
  caseManager: string;
  reason: string;
  action: string;
  gender: string;
  middleName: string;
  birthPlace: string;
  profession: string;
  sourceOfWealth: string;
  canton: string;
  idDocIssueDate: string;
  idDocValidUntil: string;
  idDocIssuingCountryCode: string;
}

function parseIndicators(value?: string): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function parsePersonOverrides(value?: string): MrosPersonOverrides {
  if (!value) return {};
  try {
    return JSON.parse(value) as MrosPersonOverrides;
  } catch {
    return {};
  }
}

export default function ComplianceMrosDetailScreen(): JSX.Element {
  useComplianceGuard();

  const { id } = useParams<{ id: string }>();
  const { translate, translateError } = useSettingsContext();
  const { getMrosById, updateMros, getUserData } = useCompliance();
  const { navigate } = useNavigation();
  const { rootRef } = useLayoutContext();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [mros, setMros] = useState<MrosListEntry>();
  const [userDataDetails, setUserDataDetails] = useState<ComplianceUserData>();

  const [indicators, setIndicators] = useState<string[]>([]);
  const [transactionIds, setTransactionIds] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({ mode: 'onTouched' });

  useLayoutOptions({ title: translate('screens/compliance', 'MROS Report'), backButton: true });

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(undefined);
    getMrosById(+id)
      .then(async (entry) => {
        setMros(entry);
        const overrides = parsePersonOverrides(entry.personOverrides);
        reset({
          status: entry.status,
          submissionDate: entry.submissionDate ? String(entry.submissionDate).split('T')[0] : '',
          authorityReference: entry.authorityReference ?? '',
          caseManager: entry.caseManager,
          reason: entry.reason ?? '',
          action: entry.action ?? '',
          gender: overrides.gender ?? '',
          middleName: overrides.middleName ?? '',
          birthPlace: overrides.birthPlace ?? '',
          profession: overrides.profession ?? '',
          sourceOfWealth: overrides.sourceOfWealth ?? '',
          canton: overrides.canton ?? '',
          idDocIssueDate: overrides.idDocIssueDate ?? '',
          idDocValidUntil: overrides.idDocValidUntil ?? '',
          idDocIssuingCountryCode: overrides.idDocIssuingCountryCode ?? '',
        });
        setIndicators(parseIndicators(entry.indicators));
        setTransactionIds(entry.transactions?.map((t) => t.id) ?? []);
        try {
          const data = await getUserData(entry.userData.id);
          setUserDataDetails(data);
        } catch {
          // non-fatal: transactions section just shows no options
        }
      })
      .catch((e: Error) => setLoadError(e.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function onSubmit(formData: FormData): Promise<void> {
    if (!id) return;
    setIsSaving(true);
    setSaveError(undefined);
    setSaveSuccess(false);

    const overrides: MrosPersonOverrides = {
      gender: formData.gender || undefined,
      middleName: formData.middleName || undefined,
      birthPlace: formData.birthPlace || undefined,
      profession: formData.profession || undefined,
      sourceOfWealth: formData.sourceOfWealth || undefined,
      canton: formData.canton || undefined,
      idDocIssueDate: formData.idDocIssueDate || undefined,
      idDocValidUntil: formData.idDocValidUntil || undefined,
      idDocIssuingCountryCode: formData.idDocIssuingCountryCode || undefined,
    };

    try {
      await updateMros(+id, {
        status: formData.status,
        submissionDate: formData.submissionDate || undefined,
        authorityReference: formData.authorityReference || undefined,
        caseManager: formData.caseManager,
        reason: formData.reason || undefined,
        action: formData.action || undefined,
        indicators,
        personOverrides: overrides,
        transactionIds,
      });
      setSaveSuccess(true);
      // reload fresh state
      const fresh = await getMrosById(+id);
      setMros(fresh);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  }

  const rules = Utils.createRules({
    status: Validations.Required,
    caseManager: Validations.Required,
  });

  function toggleIndicator(code: string): void {
    setIndicators((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function toggleTransaction(txId: number): void {
    setTransactionIds((prev) => (prev.includes(txId) ? prev.filter((id) => id !== txId) : [...prev, txId]));
  }

  if (isLoading) return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  if (loadError) return <ErrorHint message={loadError} />;
  if (!mros) return <ErrorHint message={translate('screens/compliance', 'MROS report not found')} />;

  const availableCodes = Array.from(new Set([...DEFAULT_MROS_INDICATOR_CODES, ...indicators]));
  const txOptions = userDataDetails?.transactions ?? [];

  return (
    <div className="w-full flex flex-col gap-6 max-w-4xl text-left">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-dfxGray-700 mb-3">{translate('screens/compliance', 'Overview')}</h2>
        <table className="text-sm text-dfxBlue-800 text-left">
          <tbody>
            <DetailRow label="ID" value={mros.id} />
            <DetailRow label="Created" value={formatDateTime(String(mros.created))} />
            <DetailRow label="Updated" value={formatDateTime(String(mros.updated))} />
            <DetailRow label="UserData ID" value={mros.userData.id} />
            <tr>
              <td className="pr-3 py-0.5 font-medium whitespace-nowrap">Status:</td>
              <td className="py-0.5">{mrosStatusBadge(mros.status)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
        <StyledVerticalStack gap={6} full>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-dfxGray-700 mb-3">{translate('screens/compliance', 'Report')}</h2>
            <StyledVerticalStack gap={4} full>
              <StyledDropdown<MrosStatus>
                rootRef={rootRef}
                name="status"
                label={translate('screens/compliance', 'Status')}
                placeholder={translate('general/actions', 'Select') + '...'}
                items={Object.values(MrosStatus)}
                labelFunc={(item) => item}
                full
                smallLabel
              />
              <StyledInput
                name="submissionDate"
                type="date"
                label={translate('screens/compliance', 'Submission Date')}
                full
                smallLabel
              />
              <StyledInput
                name="authorityReference"
                label={translate('screens/compliance', 'MROS ID')}
                full
                smallLabel
              />
              <StyledInput
                name="caseManager"
                label={translate('screens/compliance', 'Case Manager')}
                full
                smallLabel
              />
              <StyledInput
                name="reason"
                label={translate('screens/compliance', 'Reason (Sachverhalt)')}
                multiLine
                full
                smallLabel
              />
              <StyledInput
                name="action"
                label={translate('screens/compliance', 'Action (Grund / Unternommen)')}
                multiLine
                full
                smallLabel
              />

              <div>
                <label className="block text-sm font-medium text-dfxBlue-800 mb-2">
                  {translate('screens/compliance', 'Indicators')}
                </label>
                <div className="flex flex-col gap-1">
                  {availableCodes.map((code) => (
                    <label key={code} className="flex items-center gap-2 text-sm text-dfxBlue-800">
                      <input
                        type="checkbox"
                        checked={indicators.includes(code)}
                        onChange={() => toggleIndicator(code)}
                      />
                      {code}
                    </label>
                  ))}
                </div>
              </div>
            </StyledVerticalStack>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-dfxGray-700 mb-3">{translate('screens/compliance', 'Person Overrides')}</h2>
            <StyledVerticalStack gap={4} full>
              <StyledInput name="gender" label="Gender (M / F)" full smallLabel />
              <StyledInput name="middleName" label="Middle Name" full smallLabel />
              <StyledInput name="birthPlace" label="Birth Place" full smallLabel />
              <StyledInput name="profession" label="Profession" full smallLabel />
              <StyledInput name="sourceOfWealth" label="Source of Wealth" full smallLabel />
              <StyledInput name="canton" label="Canton" full smallLabel />
              <StyledInput name="idDocIssueDate" type="date" label="ID Document — Issue Date" full smallLabel />
              <StyledInput name="idDocValidUntil" type="date" label="ID Document — Valid Until" full smallLabel />
              <StyledInput
                name="idDocIssuingCountryCode"
                label="ID Document — Issuing Country Code"
                full
                smallLabel
              />
            </StyledVerticalStack>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-dfxGray-700 mb-3">{translate('screens/compliance', 'Transactions')}</h2>
            {txOptions.length === 0 ? (
              <p className="text-sm text-dfxGray-700">
                {translate('screens/compliance', 'No transactions available for this user.')}
              </p>
            ) : (
              <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
                {txOptions.map((tx: TransactionInfo) => (
                  <label key={tx.id} className="flex items-center gap-2 text-sm text-dfxBlue-800">
                    <input
                      type="checkbox"
                      checked={transactionIds.includes(tx.id)}
                      onChange={() => toggleTransaction(tx.id)}
                    />
                    <span className="font-mono">#{tx.id}</span>
                    <span>{tx.type ?? '-'}</span>
                    <span className="text-dfxGray-700">
                      {tx.inputAmount != null ? `${tx.inputAmount} ${tx.inputAsset ?? ''}` : ''}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {saveError && <ErrorHint message={saveError} />}
          {saveSuccess && (
            <p className="text-sm text-dfxGreen-300">
              {translate('screens/compliance', 'MROS report saved successfully')}
            </p>
          )}

          <StyledButton
            type="submit"
            label={translate('general/actions', 'Save')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            color={StyledButtonColor.BLUE}
            isLoading={isSaving}
          />
          <StyledButton
            label={translate('general/actions', 'Cancel')}
            onClick={() => navigate(-1)}
            width={StyledButtonWidth.FULL}
            color={StyledButtonColor.WHITE}
            disabled={isSaving}
          />
        </StyledVerticalStack>
      </Form>
    </div>
  );
}
