import { AccountType, KycStatus, useApi, Utils, Validations } from '@dfx.swiss/react';
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
import { useComplianceGuard } from 'src/hooks/guard.hook';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';

interface FormData {
  key: string;
}

interface UserSearchResult {
  id: number;
  kycStatus: KycStatus;
  accountType?: AccountType;
  mail?: string;
  name?: string;
}

export default function ComplianceScreen(): JSX.Element {
  useComplianceGuard();

  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>();
  const [showInfo, setShowInfo] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isValid, errors },
  } = useForm<FormData>({ mode: 'onChange' });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(undefined);
    setUserSearchResults(undefined);

    call<UserSearchResult[]>({
      url: `support?key=${data.key}`,
      method: 'GET',
    })
      .then(setUserSearchResults)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  const rules = Utils.createRules({
    key: Validations.Required,
  });

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
                    <li>
                      <strong>User ID:</strong> 1
                    </li>
                    <li>
                      <strong>Email:</strong> user@example.com
                    </li>
                    <li>
                      <strong>Phone:</strong> +xxxxxxxxxxx
                    </li>
                    <li>
                      <strong>IP address:</strong> 192.168.1.1
                    </li>
                    <li>
                      <strong>KYC hash:</strong> xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                    </li>
                    <li>
                      <strong>Bank reference:</strong> xxxx-xxxx-xxxx
                    </li>
                    <li>
                      <strong>Referral code:</strong> xxx-xxx
                    </li>
                    <li>
                      <strong>Blockchain address:</strong> 0x... or bc1... etc.
                    </li>
                    <li>
                      <strong>Transaction ID:</strong> Blockchain TX hash
                    </li>
                    <li>
                      <strong>Name:</strong> Min. 2 characters
                    </li>
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
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'User ID')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'KYC status')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/kyc', 'Account Type')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/compliance', 'Email')}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">
                        {translate('screens/kyc', 'Name')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSearchResults.map((u) => (
                      <tr key={u.id} className={`border-b border-dfxGray-300 hover:bg-dfxGray-300 transition-colors`}>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.id}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.kycStatus}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.accountType ?? '-'}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.mail ?? '-'}</td>
                        <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.name ?? '-'}</td>
                      </tr>
                    ))}
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
