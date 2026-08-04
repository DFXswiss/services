import { KycStatus } from '@dfx.swiss/react';
import { ReactNode, useRef, useState } from 'react';
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
  isLink?: boolean;
  href?: string;
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
  const kycStatusActionPending = useRef(false);
  const contactName = [userData.firstname, userData.surname].filter(Boolean).join(' ') || '-';
  const accountType = display(userData.accountType);
  const isOrganization = accountType === 'Organization' || accountType === 'SoleProprietorship';

  async function setKycStatusCheck(): Promise<void> {
    if (kycStatusActionPending.current || isSaving) return;
    if (
      !window.confirm(
        `KYC-Status für UserData ${userData.id} wirklich von ${display(
          userData.kycStatus,
        )} auf Check setzen?\n\nDiese produktive Änderung gilt für alle Benutzer dieser UserData.`,
      )
    )
      return;

    kycStatusActionPending.current = true;
    setIsSettingKycStatus(true);
    try {
      await onSetKycStatusCheck();
    } finally {
      kycStatusActionPending.current = false;
      setIsSettingKycStatus(false);
    }
  }

  const fields: HeaderField[] = [
    { label: 'UserDataId', value: display(userData.id) },
    { label: 'Account Type', value: accountType },
    ...(isOrganization
      ? [
          { label: 'Organization', value: display(userData.organization?.name) },
          { label: 'Legal Entity', value: extractLegalEntity(kycSteps, accountType) },
          { label: 'Adresse', value: buildAddress(userData.organization) },
          { label: 'Ansprechsperson', value: contactName },
        ]
      : [
          { label: 'Name', value: contactName },
          { label: 'Adresse', value: buildAddress(userData) },
          { label: 'Geburtstag', value: userData.birthday ? formatBirthday(userData.birthday) : '-' },
          { label: 'VerifiedName', value: display(userData.verifiedName) },
        ]),
    { label: 'Mail', value: display(userData.mail) },
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
              <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 font-medium">{field.label}</td>
              <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 break-all">
                {field.isLink && field.href ? (
                  <a
                    href={field.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dfxBlue-300 underline hover:text-dfxBlue-800 transition-colors"
                  >
                    {field.value}
                  </a>
                ) : (
                  field.value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
