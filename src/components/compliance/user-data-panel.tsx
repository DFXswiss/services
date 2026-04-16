import { useState } from 'react';
import { LimitRequestModal } from 'src/components/compliance/limit-request-modal';
import { formatDate, formatDateTime } from 'src/util/compliance-helpers';

interface UserDataPanelProps {
  userData: Record<string, unknown>;
  keyLabel: string;
  valueLabel: string;
  titleLabel: string;
  userDataId?: number;
  onLimitRequestCreated?: () => void;
}

const fieldOrder = [
  'id',
  'firstname',
  'accountType',
  'kycStatus',
  'kycLevel',
  'kycType',
  'kycHash',
  'mail',
  'phone',
  'street',
  'zip',
  'country',
  'nationality',
  'language',
  'birthday',
  'status',
  'riskStatus',
  'highRisk',
  'pep',
  'amlAccountType',
  'amlListAddedDate',
  'amlListExpiredDate',
  'amlListStatus',
  'bankDatas',
  'bankTransactionVerification',
  'depositLimit',
  'hasBankTx',
  'hasIpRisk',
  'identificationType',
  'isTrustedReferrer',
  'phoneCallStatus',
  'postAmlCheck',
  'tradeApprovalDate',
  'verifiedName',
  'wallet',
  'currency',
  'buyVolume',
  'monthlyBuyVolume',
  'annualBuyVolume',
  'sellVolume',
  'monthlySellVolume',
  'annualSellVolume',
  'cryptoVolume',
  'monthlyCryptoVolume',
  'annualCryptoVolume',
  'created',
  'updated',
];

const combinedFields: Record<string, string> = {
  firstname: 'surname',
  street: 'houseNumber',
  zip: 'location',
};

const hiddenFields = [...Object.values(combinedFields), 'apiFilterCT', 'apiKeyCT'];

function formatValue(key: string, value: unknown): string {
  if (key.endsWith('Date') && typeof value === 'string' && value.includes('T')) {
    return formatDate(value);
  }
  if ((key === 'created' || key === 'updated') && typeof value === 'string' && value.includes('T')) {
    return formatDateTime(value);
  }
  if (key === 'birthday' && typeof value === 'string' && value.includes('T')) {
    return formatDate(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((i: Record<string, unknown>) => i.name || i.iban || i.id).join(', ') : '-';
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const displayName = obj.name || obj.symbol || obj.displayName;
    return displayName ? `${displayName} (${obj.id})` : String(obj.id);
  }
  return value?.toString() || '-';
}

export function UserDataPanel({
  userData,
  keyLabel,
  valueLabel,
  titleLabel,
  userDataId,
  onLimitRequestCreated,
}: UserDataPanelProps): JSX.Element {
  const [showAll, setShowAll] = useState(false);
  const [showLimitRequestModal, setShowLimitRequestModal] = useState(false);

  const allEntries = Object.entries(userData)
    .filter(([key]) => !hiddenFields.includes(key))
    .sort(([a], [b]) => {
      const indexA = fieldOrder.indexOf(a);
      const indexB = fieldOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

  const visibleEntries = showAll
    ? allEntries
    : allEntries.filter(([key]) => fieldOrder.includes(key) || combinedFields[key]);

  const hiddenCount =
    allEntries.length - allEntries.filter(([key]) => fieldOrder.includes(key) || combinedFields[key]).length;

  return (
    <>
      <div>
        <h2 className="text-dfxGray-700 mb-2">
          {titleLabel} ({Object.keys(userData).length})
        </h2>
        <div className="bg-white rounded-lg shadow-sm">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-dfxGray-300">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">{keyLabel}</th>
                <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map(([key, value]) => {
                const valueString = formatValue(key, value);
                const secondaryField = combinedFields[key];

                if (secondaryField) {
                  const secondaryValue = userData[secondaryField] || '';
                  const combinedValue = [valueString, secondaryValue].filter(Boolean).join(' ') || '-';
                  return (
                    <tr key={key} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                      <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 font-medium">
                        {key} / {secondaryField}
                      </td>
                      <td className="px-3 py-2 text-left text-sm text-dfxBlue-800">{combinedValue}</td>
                    </tr>
                  );
                }

                return (
                  <tr key={key} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                    <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 font-medium">{key}</td>
                    <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 break-all">
                      {key === 'kycHash' && valueString !== '-' ? (
                        <a
                          href={`/kyc?code=${valueString}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-dfxBlue-300 underline hover:text-dfxBlue-800"
                        >
                          {valueString}
                        </a>
                      ) : key === 'depositLimit' && userDataId ? (
                        <div className="flex items-center justify-between gap-2">
                          <span>{valueString}</span>
                          <button
                            className="px-3 py-1 text-xs text-white bg-dfxBlue-800 hover:bg-dfxBlue-800/80 rounded transition-colors whitespace-nowrap"
                            onClick={() => setShowLimitRequestModal(true)}
                          >
                            Limit Request
                          </button>
                        </div>
                      ) : (
                        valueString
                      )}
                    </td>
                  </tr>
                );
              })}
              {hiddenCount > 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-center">
                    <button
                      className="text-sm text-dfxBlue-300 hover:text-dfxBlue-800"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? `Hide ${hiddenCount} fields` : `Show ${hiddenCount} more fields...`}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {userDataId && (
        <LimitRequestModal
          isOpen={showLimitRequestModal}
          userDataId={userDataId}
          defaultName={[userData.firstname, userData.surname].filter(Boolean).join(' ') || undefined}
          onClose={() => setShowLimitRequestModal(false)}
          onCreated={onLimitRequestCreated}
        />
      )}
    </>
  );
}
