import { KycStatus } from '@dfx.swiss/react';
import { ReactNode, useState } from 'react';
import { KycStepInfo, UserDataDetail } from 'src/hooks/compliance.hook';
import { buildAddress, display, extractLegalEntity, formatBirthday, refName } from 'src/util/compliance-helpers';
import { formatSwissDate } from 'src/util/utils';

interface ComplianceReviewHeaderProps {
  userData: UserDataDetail;
  kycSteps: KycStepInfo[];
  isSaving: boolean;
  onSetKycStatusCheck: () => Promise<void>;
}

interface HeaderField {
  label: string;
  value: ReactNode;
  // Values that are always copied as a whole (ids, names, mail): one click selects the entire value.
  copyWhole?: boolean;
}

function extractStepCreatedDate(kycSteps: KycStepInfo[]): string {
  const step = kycSteps.filter((s) => s.name === 'LegalEntity').sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];

  if (!step) return '-';
  return formatSwissDate(step.created);
}

export function ComplianceReviewHeader({
  userData,
  kycSteps,
  isSaving,
  onSetKycStatusCheck,
}: Readonly<ComplianceReviewHeaderProps>): JSX.Element {
  const [isSettingKycStatus, setIsSettingKycStatus] = useState(false);
  const contactName = [userData.firstname, userData.surname].filter(Boolean).join(' ') || '-';
  const accountType = display(userData.accountType);
  const isOrganization = accountType === 'Organization' || accountType === 'SoleProprietorship';

  async function setKycStatusCheck(): Promise<void> {
    if (
      !window.confirm(
        `KYC-Status für UserData ${userData.id} wirklich von ${display(
          userData.kycStatus,
        )} auf Check setzen?\n\nDiese produktive Änderung gilt für alle Benutzer dieser UserData.`,
      )
    )
      return;

    setIsSettingKycStatus(true);
    try {
      await onSetKycStatusCheck();
    } finally {
      setIsSettingKycStatus(false);
    }
  }

  const fields: HeaderField[] = [
    { label: 'UserDataId', value: display(userData.id), copyWhole: true },
    { label: 'Account Type', value: accountType },
    ...(isOrganization
      ? [
          { label: 'Organization', value: display(userData.organization?.name), copyWhole: true },
          { label: 'Legal Entity', value: extractLegalEntity(kycSteps, accountType) },
          { label: 'Adresse', value: buildAddress(userData.organization) },
          { label: 'Ansprechsperson', value: contactName, copyWhole: true },
        ]
      : [
          { label: 'Name', value: contactName, copyWhole: true },
          { label: 'Adresse', value: buildAddress(userData) },
          { label: 'Geburtstag', value: userData.birthday ? formatBirthday(userData.birthday) : '-' },
          { label: 'VerifiedName', value: display(userData.verifiedName), copyWhole: true },
        ]),
    { label: 'Mail', value: display(userData.mail), copyWhole: true },
    { label: 'Sprache', value: refName(userData.language) },
    { label: 'KYC Level', value: display(userData.kycLevel) },
    {
      label: 'KYC Status',
      value: (
        <div className="flex flex-wrap items-center gap-3">
          <span>{display(userData.kycStatus)}</span>
          {userData.kycStatus !== KycStatus.CHECK && (
            <button
              type="button"
              className="px-2 py-1 text-xs font-medium text-white bg-dfxBlue-800 hover:bg-dfxBlue-800/80 rounded transition-colors disabled:opacity-50"
              disabled={isSaving || isSettingKycStatus}
              onClick={setKycStatusCheck}
            >
              {isSettingKycStatus ? 'Wird gesetzt...' : 'Auf Check setzen'}
            </button>
          )}
        </div>
      ),
    },
    ...(isOrganization ? [{ label: 'Datum Dokument eingereicht', value: extractStepCreatedDate(kycSteps) }] : []),
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-dfxGray-300">
          <tr>
            <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Feld</th>
            <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Wert</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.label} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
              {/* The label cannot be selected, so a copied value never carries the label cell. */}
              <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 font-medium select-none">{field.label}</td>
              <td
                className={`px-3 py-2 text-left text-sm text-dfxBlue-800 break-all ${field.copyWhole ? 'select-all' : ''}`}
              >
                {field.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
