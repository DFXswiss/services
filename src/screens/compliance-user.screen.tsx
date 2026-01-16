import { ApiError, useKyc } from '@dfx.swiss/react';
import { SpinnerSize, StyledLoadingSpinner } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import {
  BankDataInfo,
  BuyRouteInfo,
  ComplianceUserData,
  KycFile,
  KycStepInfo,
  SellRouteInfo,
  TransactionInfo,
  UserInfo,
  useCompliance,
} from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

type TabType = 'transactions' | 'users' | 'kycSteps' | 'bankDatas' | 'buyRoutes' | 'sellRoutes';

interface TabConfig {
  id: TabType;
  label: string;
  count: number;
}

// Define the display order for user data fields
const fieldOrder = [
  'id',
  'firstname', // includes surname
  'accountType',
  'kycStatus',
  'kycLevel',
  'kycType',
  'kycHash',
  'mail',
  'phone',
  'street', // includes houseNumber
  'zip', // includes location
  'country',
  'nationality',
  'language',
  'birthday',
  'status',
  'riskStatus',
  'bankTransactionVerification',
  'wallet',
  'currency',
  'created',
  'updated',
];

// Fields that are combined with another field (primary -> secondary)
const combinedFields: Record<string, string> = {
  firstname: 'surname',
  street: 'houseNumber',
  zip: 'location',
};

// Hidden fields are the secondary fields from combinedFields
const hiddenFields = Object.values(combinedFields);

export default function ComplianceUserScreen(): JSX.Element {
  useComplianceGuard();

  const { translate } = useSettingsContext();
  const { id: userDataId } = useParams();
  const { getUserData } = useCompliance();
  const { getFile } = useKyc();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<ComplianceUserData>();
  const [preview, setPreview] = useState<{ url: string; contentType: string; name: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

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
    } catch (e: any) {
      setError(e.message ?? 'Error loading file');
    }
  }

  function closePreview(): void {
    setPreview(undefined);
  }

  useEffect(() => {
    if (userDataId) {
      setIsLoading(true);
      getUserData(+userDataId)
        .then(setData)
        .catch((e: ApiError) => setError(e.message ?? 'Unknown error'))
        .finally(() => setIsLoading(false));
    } else {
      setError('No ID provided');
    }
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
          {/* Top Section: User Data | KYC Files | File Preview */}
          <div className="flex gap-4 min-h-[400px]">
            {/* Left: User Data */}
            <div>
              <h2 className="text-dfxGray-700 mb-2">
                {translate('screens/compliance', 'User Data')} ({Object.keys(data.userData).length})
              </h2>
              <div className="bg-white rounded-lg shadow-sm">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'Key')}
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'Value')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.userData)
                      .filter(([key]) => !hiddenFields.includes(key))
                      .sort(([a], [b]) => {
                        const indexA = fieldOrder.indexOf(a);
                        const indexB = fieldOrder.indexOf(b);
                        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                      })
                      .map(([key, value]) => {
                        let valueString = value?.toString() || '-';

                        if (Array.isArray(value)) {
                          valueString = value.length > 0 ? value.map((i) => i.name || i.iban || i.id).join(', ') : '-';
                        } else if (value && typeof value === 'object') {
                          // Show name/symbol if available, otherwise just ID
                          const displayName = value.name || value.symbol || value.displayName;
                          valueString = displayName ? `${displayName} (${value.id})` : String(value.id);
                        }

                        // Handle combined fields
                        const secondaryField = combinedFields[key];
                        if (secondaryField) {
                          const secondaryValue = (data.userData as Record<string, any>)[secondaryField] || '';
                          const combinedValue = [valueString, secondaryValue].filter(Boolean).join(' ') || '-';
                          return (
                            <tr
                              key={key}
                              className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                            >
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
                            <td className="px-3 py-2 text-left text-sm text-dfxBlue-800 break-all">{valueString}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Middle: KYC Files */}
            <div className="w-1/4 min-w-[200px]">
              <h2 className="text-dfxGray-700 mb-2">
                {translate('screens/compliance', 'KYC Files')} ({data.kycFiles?.length || 0})
              </h2>
              <div className="bg-white rounded-lg shadow-sm max-h-[70vh] overflow-auto">
                {data.kycFiles?.length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-dfxGray-300">
                      <tr>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.kycFiles.map((file: KycFile) => (
                        <tr
                          key={file.id}
                          className="group border-b border-dfxGray-300 transition-colors hover:bg-dfxBlue-400 cursor-pointer"
                          onClick={() => openFile(file)}
                        >
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 group-hover:text-white">{file.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 group-hover:text-white underline">
                            {file.name}
                          </td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 group-hover:text-white">{file.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-dfxGray-700 text-sm">No KYC files</div>
                )}
              </div>
            </div>

            {/* Right: File Preview */}
            <div className="flex-1 min-w-[400px]">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-dfxGray-700">
                  {preview ? preview.name : translate('screens/compliance', 'File Preview')}
                </h2>
                {preview && (
                  <button
                    onClick={closePreview}
                    className="text-dfxGray-700 hover:text-dfxBlue-800 text-2xl font-bold px-2"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm h-[70vh] flex items-center justify-center">
                {preview ? (
                  preview.contentType.includes('pdf') ? (
                    <embed src={`${preview.url}#navpanes=0`} type="application/pdf" className="w-full h-full" />
                  ) : (
                    <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain" />
                  )
                ) : (
                  <div className="text-dfxGray-700 text-sm">Click a file to preview</div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Tabs */}
          <div className="w-full">
            {/* Tab Headers */}
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

            {/* Tab Content */}
            <div className="bg-white rounded-b-lg shadow-sm p-4 max-h-[40vh] overflow-auto">
              {/* Users Tab */}
              {activeTab === 'users' && (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Address</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Role</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users?.length > 0 ? (
                      data.users.map((user: UserInfo) => (
                        <tr
                          key={user.id}
                          className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                        >
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{user.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono">{user.address}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{user.role}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{user.status}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">
                            {new Date(user.created).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-dfxGray-700">
                          No users
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* KYC Steps Tab */}
              {activeTab === 'kycSteps' && (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Sequence</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kycSteps?.length > 0 ? (
                      data.kycSteps.map((step: KycStepInfo) => (
                        <tr
                          key={step.id}
                          className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                        >
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{step.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{step.name}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{step.type || '-'}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                step.status === 'Completed'
                                  ? 'bg-green-100 text-green-800'
                                  : step.status === 'Failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {step.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{step.sequenceNumber}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">
                            {new Date(step.created).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-dfxGray-700">
                          No KYC steps
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Bank Data Tab */}
              {activeTab === 'bankDatas' && (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">IBAN</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bankDatas?.length > 0 ? (
                      data.bankDatas.map((bankData: BankDataInfo) => (
                        <tr
                          key={bankData.id}
                          className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                        >
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{bankData.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono">{bankData.iban}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{bankData.name}</td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${bankData.approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {bankData.approved ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-dfxGray-700">
                          No bank data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Buy Routes Tab */}
              {activeTab === 'buyRoutes' && (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Bank Usage</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Asset</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Blockchain</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Volume</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buyRoutes?.length > 0 ? (
                      data.buyRoutes.map((buy: BuyRouteInfo) => (
                        <tr key={buy.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{buy.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono">{buy.bankUsage}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{buy.assetName}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{buy.blockchain}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{buy.volume?.toFixed(2)}</td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${buy.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                            >
                              {buy.active ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-dfxGray-700">
                          No buy routes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Sell Routes Tab */}
              {activeTab === 'sellRoutes' && (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">IBAN</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Fiat</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sellRoutes?.length > 0 ? (
                      data.sellRoutes.map((sell: SellRouteInfo) => (
                        <tr
                          key={sell.id}
                          className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300"
                        >
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{sell.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono">{sell.iban}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{sell.fiatName || '-'}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{sell.volume?.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-dfxGray-700">
                          No sell routes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-dfxGray-300">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">ID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">UID</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Type</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Source</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Amount (CHF)</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">AML Check</th>
                      <th className="px-3 py-2 text-left text-sm font-semibold text-dfxBlue-800">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.transactions?.length > 0 ? (
                      data.transactions.map((tx: TransactionInfo) => (
                        <tr key={tx.id} className="border-b border-dfxGray-300 transition-colors hover:bg-dfxGray-300">
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{tx.id}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800 font-mono text-xs">{tx.uid}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{tx.type || '-'}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{tx.sourceType}</td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">{tx.amountInChf?.toFixed(2) || '-'}</td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                tx.amlCheck === 'Pass'
                                  ? 'bg-green-100 text-green-800'
                                  : tx.amlCheck === 'Fail'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {tx.amlCheck || '-'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-dfxBlue-800">
                            {new Date(tx.created).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-dfxGray-700">
                          No transactions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
