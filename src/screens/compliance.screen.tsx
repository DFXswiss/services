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
  accountType: string;
  mail: string;
  verifiedName: string;
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
            <>
              <StyledDataTable heading={translate('screens/compliance', 'Matching customers')} minWidth={false}>
                {userSearchResults.map((u) => (
                  <StyledDataTableRow key={u.userDataId}>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex justify-between">
                        <span className="font-semibold">ID:</span>
                        <span>{u.userDataId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">{translate('screens/compliance', 'Name')}:</span>
                        <span>{u.verifiedName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">{translate('screens/compliance', 'Email')}:</span>
                        <span>{u.mail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">{translate('screens/compliance', 'KYC Status')}:</span>
                        <span>{u.kycStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">{translate('screens/compliance', 'Account Type')}:</span>
                        <span>{u.accountType}</span>
                      </div>
                    </div>
                  </StyledDataTableRow>
                ))}
              </StyledDataTable>
            </>
          ) : (
            <p className="text-dfxGray-700">{translate('screens/compliance', 'No customers found')}</p>
          ))}
      </StyledVerticalStack>
    </Form>
  );
}
