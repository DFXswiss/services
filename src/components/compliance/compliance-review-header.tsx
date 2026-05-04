import { KycStepInfo, UserDataDetail } from 'src/hooks/compliance.hook';
import { buildAddress, display, formatDate, refName } from 'src/util/compliance-helpers';

interface ComplianceReviewHeaderProps {
  userData: UserDataDetail;
  kycSteps: KycStepInfo[];
}

interface HeaderField {
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
}

function extractLegalEntityFromStep(kycSteps: KycStepInfo[], accountType: string): string {
  if (accountType === 'SoleProprietorship') return 'Einzelunternehmen';

  const legalEntityStep = kycSteps
    .filter((s) => s.name === 'LegalEntity')
    .sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];

  if (legalEntityStep?.result) {
    try {
      const parsed = JSON.parse(legalEntityStep.result) as Record<string, unknown>;
      if (parsed.legalEntity) return String(parsed.legalEntity);
    } catch {
      // ignore parse errors
    }
  }

  return '-';
}

function extractStepCreatedDate(kycSteps: KycStepInfo[]): string {
  const step = kycSteps.filter((s) => s.name === 'LegalEntity').sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0];

  if (!step) return '-';
  return new Date(step.created).toLocaleDateString('de-CH');
}

export function ComplianceReviewHeader({ userData, kycSteps }: Readonly<ComplianceReviewHeaderProps>): JSX.Element {
  const contactName = [userData.firstname, userData.surname].filter(Boolean).join(' ') || '-';
  const accountType = display(userData.accountType);
  const isOrganization = accountType === 'Organization' || accountType === 'SoleProprietorship';

  const fields: HeaderField[] = [
    { label: 'UserDataId', value: display(userData.id) },
    { label: 'Account Type', value: accountType },
    ...(isOrganization
      ? [
          { label: 'Organization', value: display(userData.organization?.name) },
          { label: 'Legal Entity', value: extractLegalEntityFromStep(kycSteps, accountType) },
          { label: 'Adresse', value: buildAddress(userData.organization) },
          { label: 'Ansprechsperson', value: contactName },
        ]
      : [
          { label: 'Name', value: contactName },
          { label: 'Adresse', value: buildAddress(userData) },
          { label: 'Geburtstag', value: userData.birthday ? formatDate(userData.birthday) : '-' },
          { label: 'VerifiedName', value: display(userData.verifiedName) },
        ]),
    { label: 'Mail', value: display(userData.mail) },
    { label: 'Sprache', value: refName(userData.language) },
    { label: 'KYC Level', value: display(userData.kycLevel) },
    { label: 'KYC Status', value: display(userData.kycStatus) },
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
