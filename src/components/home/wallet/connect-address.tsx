import { ApiError, useApi, UserAddress, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { ConnectProps } from 'src/components/home/connect-shared';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useWindowContext } from 'src/contexts/window.context';
import { blankedAddress, sortAddressesByBlockchain } from 'src/util/utils';

interface FormData {
  address: UserAddress;
}

export default function ConnectAddress({ onLogin, onCancel }: ConnectProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { user, isUserLoading } = useUserContext();
  const { width } = useWindowContext();
  const { setWallet, setSession } = useWalletContext();
  const { changeAddress } = useUserContext();
  const { call } = useApi();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const isCustodySignup = !user?.addresses.length;

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    const preselectedAddress = user?.activeAddress ?? (user?.addresses.length === 1 ? user.addresses[0] : undefined);
    if (preselectedAddress) {
      setValue('address', preselectedAddress);
    }
  }, [user?.activeAddress, user?.addresses]);

  useEffect(() => {
    if (selectedAddress?.address && user?.activeAddress?.address !== selectedAddress?.address && !isUserLoading) {
      setIsLoading(true);
      changeAddress(selectedAddress.address)
        .then(() => {
          setWallet();
          onLogin();
        })
        .catch(() => setIsLoading(false));
    }
  }, [selectedAddress, user?.activeAddress, isUserLoading]);

  useEffect(() => {
    if (!isUserLoading && isCustodySignup) {
      call<{ accessToken: string }>({
        url: 'custody',
        method: 'POST',
        data: {
          addressType: 'EVM',
        },
      })
        .then(({ accessToken }) => {
          setSession(accessToken);
          onLogin();
        })
        .catch((error: ApiError) => setError(error.message ?? 'Unknown error'));
    }
  }, [isCustodySignup, isUserLoading]);

  return (isLoading || isUserLoading || isCustodySignup) && !error ? (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  ) : error ? (
    <div>
      <ErrorHint message={error} />
    </div>
  ) : (
    <StyledVerticalStack gap={4} center full marginY={4} className="z-10">
      {user?.addresses.length && (
        <>
          <p className="text-dfxGray-700">
            {translate('screens/home', 'Please select an address or add a new one to continue.')}
          </p>

          <Form control={control} errors={errors}>
            <StyledDropdown
              name="address"
              placeholder={translate('general/actions', 'Select') + '...'}
              items={user.addresses.sort(sortAddressesByBlockchain)}
              labelFunc={(item) => blankedAddress(item.address, { width })}
              descriptionFunc={(item) => item.label ?? item.wallet}
              forceEnable={user?.activeAddress === undefined}
            />
          </Form>
        </>
      )}
      <StyledButton
        label={translate('general/actions', 'Add new address')}
        width={StyledButtonWidth.FULL}
        onClick={onCancel}
      />
    </StyledVerticalStack>
  );
}
