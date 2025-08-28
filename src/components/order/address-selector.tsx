import { Blockchain, useAuthContext } from '@dfx.swiss/react';
import { StyledDropdown } from '@dfx.swiss/react-components';
import React, { useMemo } from 'react';
import { Control } from 'react-hook-form';
import { addressLabel } from 'src/config/labels';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useWindowContext } from 'src/contexts/window.context';
import { blankedAddress } from 'src/util/utils';

interface Address {
  address: string;
  label: string;
  chain?: Blockchain;
}

interface AddressSelectorProps {
  control: Control<any>;
  name: string;
  selectedBlockchain?: Blockchain;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  control,
  name,
  selectedBlockchain,
}) => {
  const { session } = useAuthContext();
  const { rootRef } = useLayoutContext();
  const { width } = useWindowContext();

  const addressItems: Address[] = useMemo(() => {
    if (!session?.address || !selectedBlockchain) return [];

    return [
      {
        address: addressLabel(session),
        label: 'Current address',
        chain: selectedBlockchain,
      },
      {
        address: 'Switch address',
        label: 'Login with a different address',
      },
    ];
  }, [session, selectedBlockchain]);

  return (
    <StyledDropdown<Address>
      control={control}
      rootRef={rootRef}
      name={name}
      placeholder="Select address..."
      items={addressItems}
      labelFunc={(item) => blankedAddress(item.address, { width: width || 0 })}
      descriptionFunc={(item) => item.label}
      disabled={!selectedBlockchain}
      full
      forceEnable
    />
  );
};