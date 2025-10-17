import { useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
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
  userDataId: number;
  kycStatus: string;
  accountType: string | null;
  mail: string | null;
  name: string | null;
}

export default function ComplianceScreen(): JSX.Element {
  useComplianceGuard();

  const { translate, translateError } = useSettingsContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>();

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
        <StyledInput
          name="key"
          type="text"
          label={translate('screens/compliance', 'Customer search')}
          placeholder={translate('screens/kyc', 'example@mail.com')}
          full
        />

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
            <div className="w-full overflow-x-auto">
              <h2 className="text-dfxGray-700 mb-3">{translate('screens/compliance', 'Matching customers')}</h2>
              <table className="w-full border-collapse bg-white rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-dfxGray-200 border-b border-dfxGray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">User ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">KYC Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Account Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-dfxBlue-800">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {userSearchResults.map((u, index) => (
                    <tr
                      key={u.userDataId}
                      className={`border-b border-dfxGray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-dfxGray-100'
                      } hover:bg-dfxBlue-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.userDataId}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.kycStatus}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.accountType ?? '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.mail ?? '-'}</td>
                      <td className="px-4 py-3 text-left text-sm text-dfxBlue-800">{u.name ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-dfxGray-700">{translate('screens/compliance', 'No customers found')}</p>
          ))}
      </StyledVerticalStack>
    </Form>
  );
}
