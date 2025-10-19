import { KycStatus, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonWidth,
  StyledIconButton,
  StyledInfoText,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { useSettingsContext } from 'src/contexts/settings.context';
import { UserSearchResult, useCompliance } from 'src/hooks/compliance.hook';
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

interface FormData {
  key: string;
}

export default function ComplianceScreen(): JSX.Element {
  useComplianceGuard();

  const { translate, translateError } = useSettingsContext();
  const { searchUsers, downloadUserData } = useCompliance();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>();
  const [showInfo, setShowInfo] = useState(false);
  const [downloadingUserId, setDownloadingUserId] = useState<number>();

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onChange' });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(undefined);
    setUserSearchResults(undefined);

    searchUsers(data.key)
      .then(setUserSearchResults)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  async function handleDownloadUserData(userId: number) {
    setDownloadingUserId(userId);
    setError(undefined);

    downloadUserData([userId])
      .catch((e) => setError(e.message))
      .finally(() => setDownloadingUserId(undefined));
  }

  const rules = Utils.createRules({
    key: Validations.Required,
  });

  const searchExamples = [
    { label: 'User ID', example: '1' },
    { label: 'Email', example: 'user@example.com' },
    { label: 'Phone', example: '+xxxxxxxxxxx' },
    { label: 'IP address', example: '192.168.1.1' },
    { label: 'KYC hash', example: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { label: 'Bank reference', example: 'xxxx-xxxx-xxxx' },
    { label: 'Referral code', example: 'xxx-xxx' },
    { label: 'Blockchain address', example: '0x... or bc1... etc.' },
    { label: 'Transaction ID', example: 'Blockchain TX hash' },
    { label: 'Name', example: 'Min. 2 characters' },
  ];

  const tableColumns = [
    { key: 'userId', label: translate('screens/compliance', 'User ID') },
    { key: 'accountType', label: translate('screens/kyc', 'Account Type') },
    { key: 'name', label: translate('screens/kyc', 'Name') },
    { key: 'email', label: translate('screens/compliance', 'Email') },
    { key: 'actions', label: '' },
  ];

  useLayoutOptions({ title: translate('screens/compliance', 'Compliance') });

  return (
    <Form control={control} rules={rules} errors={errors} onSubmit={handleSubmit(onSubmit)} translate={translateError}>
      <StyledVerticalStack gap={6} full center>
        <div className="w-full">
          <div className="flex items-center gap-2 mb-1 pl-3">
            <label className="text-base font-semibold text-dfxBlue-800">
              {translate('screens/compliance', 'Customer search')}
            </label>
            <StyledIconButton
              icon={showInfo ? IconVariant.INFO : IconVariant.INFO_OUTLINE}
              color={IconColor.DARK_GRAY}
              size={IconSize.SM}
              onClick={() => setShowInfo(!showInfo)}
            />
          </div>
          {showInfo && (
            <div className="mb-2">
              <StyledInfoText iconColor={IconColor.BLUE}>
                <div className="text-left">
                  <strong>Search by:</strong>
                  <ul className="mt-1 ml-4 list-disc text-left text-sm">
                    {searchExamples.map((e) => (
                      <li key={e.label}>
                        <strong>{e.label}:</strong> {e.example}
                      </li>
                    ))}
                  </ul>
                </div>
              </StyledInfoText>
            </div>
          )}
          <StyledInput
            name="key"
            type="text"
            hideLabel
            placeholder={translate('screens/kyc', 'example@mail.com')}
            full
          />
        </div>

        {error && (
          <div>
            <ErrorHint message={error} />
          </div>
        )}

        <StyledButton
          type="submit"
          label={translate('general/actions', 'Search')}
          onClick={handleSubmit(onSubmit)}
          width={StyledButtonWidth.FULL}
          disabled={!isValid}
          isLoading={isLoading}
        />
        {userSearchResults &&
          (userSearchResults.length > 0 ? (
            <div className="w-full">
              <h2 className="text-dfxGray-700 mb-3">{translate('screens/compliance', 'Matching customers')}</h2>
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-dfxGray-300">
                      {tableColumns.map((column) => (
                        <th key={column.key} className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userSearchResults.map((u) => {
                      const isRedRow = [KycStatus.CHECK, KycStatus.REJECTED].includes(u.kycStatus as KycStatus);
                      return (
                        <tr
                          key={u.id}
                          className={`border-b border-dfxGray-300 transition-colors ${
                            isRedRow ? 'bg-dfxRed-100 hover:bg-dfxRed-200' : 'hover:bg-dfxGray-300'
                          }`}
                        >
                          <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.id}</td>
                          <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.accountType ?? '-'}</td>
                          <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.name ?? '-'}</td>
                          <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.mail ?? '-'}</td>
                          <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">
                            <StyledIconButton
                              icon={IconVariant.FILE}
                              color={IconColor.BLUE}
                              size={IconSize.SM}
                              onClick={() => handleDownloadUserData(u.id)}
                              isLoading={downloadingUserId === u.id}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-dfxGray-700">{translate('screens/compliance', 'No customers found')}</p>
          ))}
      </StyledVerticalStack>
    </Form>
  );
}
