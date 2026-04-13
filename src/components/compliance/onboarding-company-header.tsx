import { KycStepInfo } from 'src/hooks/compliance.hook';

interface OnboardingCompanyHeaderProps {
  userData: Record<string, unknown>;
  kycSteps: KycStepInfo[];
}

interface HeaderField {
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
}

function extractField(userData: Record<string, unknown>, key: string): string {
  const value = userData[key];
  if (value == null) return '-';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return (obj.name || obj.symbol || obj.displayName || obj.id || '-').toString();
  }
  return value.toString();
}

function buildAddress(userData: Record<string, unknown>): string {
  const parts = [
    [extractField(userData, 'organizationStreet'), extractField(userData, 'organizationHouseNumber')],
    [extractField(userData, 'organizationZip'), extractField(userData, 'organizationLocation')],
  ];

  const lines = parts.map((p) => p.filter((v) => v !== '-').join(' ')).filter(Boolean);

  const country = userData['organizationCountry'];
  if (country && typeof country === 'object') {
    const name = (country as Record<string, unknown>).name;
    if (name) lines.push(name.toString());
  }

  return lines.length > 0 ? lines.join(', ') : '-';
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

export function OnboardingCompanyHeader({ userData, kycSteps }: OnboardingCompanyHeaderProps): JSX.Element {
  const contactName =
    [extractField(userData, 'firstname'), extractField(userData, 'surname')].filter((v) => v !== '-').join(' ') || '-';

  const accountType = extractField(userData, 'accountType');

  const fields: HeaderField[] = [
    { label: 'UserDataId', value: extractField(userData, 'id') },
    { label: 'Organization', value: extractField(userData, 'organizationName') },
    { label: 'Account Type', value: accountType },
    { label: 'Legal Entity', value: extractLegalEntityFromStep(kycSteps, accountType) },
    { label: 'Adresse', value: buildAddress(userData) },
    { label: 'Ansprechsperson', value: contactName },
    { label: 'Mail', value: extractField(userData, 'mail') },
    { label: 'Sprache', value: extractField(userData, 'language') },
    { label: 'Datum Dokument eingereicht', value: extractStepCreatedDate(kycSteps) },
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
