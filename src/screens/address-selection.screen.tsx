import { UserAddress, useSessionContext, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  SpinnerSize,
  StyledDropdown,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useWindowContext } from 'src/contexts/window.context';
import { blankedAddress, sortAddressesByBlockchain } from 'src/util/utils';
import { Layout } from '../components/layout';
import { useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useWalletContext } from '../contexts/wallet.context';

interface FormData {
  address: UserAddress;
}

export default function AddressSelectionScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { isLoggedIn } = useSessionContext();
  const { user, isUserLoading } = useUserContext();
  const { width } = useWindowContext();
  const { canClose, isEmbedded } = useAppHandlingContext();
  const { isInitialized, setWallet } = useWalletContext();
  const { changeAddress } = useUserContext();

  const rootRef = useRef<HTMLDivElement>(null);

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>();

  const selectedAddress = useWatch({ control, name: 'address' });

  useEffect(() => {
    if (user?.activeAddress) {
      setValue('address', user.activeAddress);
    }
  }, [user?.activeAddress]);

  useEffect(() => {
    if (selectedAddress?.address && user?.activeAddress?.address !== selectedAddress?.address) {
      changeAddress(selectedAddress.address)
        .then(() => setWallet())
        .catch(() => {
          // ignore errors
        });
    }
  }, [selectedAddress]);

  return (
    <Layout
      title={translate('screens/home', 'Address selection')}
      backButton={canClose && !isEmbedded}
      rootRef={rootRef}
    >
      {!isInitialized || !isLoggedIn || isUserLoading ? (
        <div className="mt-4">
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        </div>
      ) : (
        <StyledVerticalStack gap={4} center full marginY={4} className="z-10">
          {user?.addresses.length && (
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
          )}
        </StyledVerticalStack>
      )}
    </Layout>
  );
}
