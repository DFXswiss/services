import { UserAddress, useUserContext } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
  const { user } = useUserContext();
  const { width } = useWindowContext();
  const { setWallet } = useWalletContext();
  const { changeAddress } = useUserContext();

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
        .then(() => {
          setWallet();
          onLogin();
        })
        .catch(() => {
          // ignore errors
        });
    }
  }, [selectedAddress, user?.activeAddress]);

  return (
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
      <StyledButton
        label={translate('general/actions', 'Add new address')}
        width={StyledButtonWidth.FULL}
        onClick={onCancel}
      />
    </StyledVerticalStack>
  );
}
