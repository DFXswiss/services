import { ApiError, useApi, useAuthContext, UserAddress, useUserContext } from '@dfx.swiss/react';
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
import { addressLabel } from 'src/config/labels';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWalletContext } from 'src/contexts/wallet.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useAppParams } from 'src/hooks/app-params.hook';
import { blankedAddress, sortAddressesByBlockchain } from 'src/util/utils';

export const CustodyAssets = ['ZCHF', 'FPS', 'DEPSPresale'];

interface FormData {
  address: UserAddress;
}

export default function ConnectAddress({ onLogin, onCancel }: ConnectProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { user, isUserLoading, hasAddress, userAddresses } = useUserContext();
  const { width } = useWindowContext();
  const { setWallet, setSession } = useWalletContext();
  const { changeAddress } = useUserContext();
  const { session } = useAuthContext();
  const { call } = useApi();
  const { assetOut } = useAppParams();
  const { rootRef } = useLayoutContext();

  const sessionHasNoAddress = !session?.address;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const isCustodySignup = !hasAddress && CustodyAssets.includes(assetOut ?? '');

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    const preselectedAddress = user?.activeAddress ?? (userAddresses.length === 1 ? userAddresses[0] : undefined);
    if (preselectedAddress) {
      setValue('address', preselectedAddress);
    }
  }, [user?.activeAddress, userAddresses]);

  useEffect(() => {
    const isAddressChange = user?.activeAddress?.address !== selectedAddress?.address;
    const needsSessionUpdate = sessionHasNoAddress && selectedAddress?.address;

    if (selectedAddress?.address && (isAddressChange || needsSessionUpdate) && !isUserLoading) {
      setIsLoading(true);
      changeAddress(selectedAddress.address)
        .then(() => {
          setWallet();
          onLogin();
        })
        .catch(() => setIsLoading(false));
    }
  }, [selectedAddress, user?.activeAddress, isUserLoading, sessionHasNoAddress]);

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
  }, [assetOut, hasAddress, isUserLoading]);

  return (isLoading || isUserLoading || isCustodySignup) && !error ? (
    <StyledLoadingSpinner size={SpinnerSize.LG} />
  ) : error ? (
    <div>
      <ErrorHint message={error} />
    </div>
  ) : (
    <StyledVerticalStack gap={4} center full marginY={4} className="z-10">
      {userAddresses.length && (
        <>
          <p className="text-dfxGray-700">
            {translate('screens/home', 'Please select an address or add a new one to continue.')}
          </p>

          <Form control={control} errors={errors}>
            <StyledDropdown
              rootRef={rootRef}
              name="address"
              placeholder={translate('general/actions', 'Select') + '...'}
              items={userAddresses.sort(sortAddressesByBlockchain)}
              labelFunc={(item) => blankedAddress(addressLabel(item), { width })}
              descriptionFunc={(item) => item.label ?? item.wallet}
              forceEnable={user?.activeAddress === undefined || sessionHasNoAddress}
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
