import { Blockchain, Session, UserAddress, useAuthContext, useUserContext } from '@dfx.swiss/react';
import { useMemo } from 'react';
import { addressLabel } from 'src/config/labels';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useBlockchain } from './blockchain.hook';

export interface AddressItem {
  address?: string;
  addressLabel: string;
  label: string;
  chain?: Blockchain;
}

interface UseAddressItemsParams {
  availableBlockchains?: Blockchain[];
}

interface UseAddressItemsResult {
  addressItems: AddressItem[];
  userSessions: (Session | UserAddress)[];
}

/**
 * Hook to generate address items for blockchain/address selection.
 * Supports linked addresses (userAddresses) for cross-chain operations.
 */
export function useAddressItems({ availableBlockchains }: UseAddressItemsParams = {}): UseAddressItemsResult {
  const { session } = useAuthContext();
  const { userAddresses } = useUserContext();
  const { translate } = useSettingsContext();
  const { toString } = useBlockchain();

  // Combine current session with linked addresses, removing duplicates
  const userSessions = useMemo(() => {
    return [session, ...userAddresses].filter(
      (a, i, arr) => a && arr.findIndex((b) => b?.address === a.address) === i,
    ) as (Session | UserAddress)[];
  }, [session, userAddresses]);

  // Create address items with their blockchains
  const userAddressItems = useMemo(() => {
    return userSessions.map((a) => ({
      address: a.address,
      addressLabel: addressLabel(a),
      blockchains: a.blockchains,
    }));
  }, [userSessions]);

  // Filter blockchains based on available blockchains and user's linked addresses
  const validBlockchains = useMemo(() => {
    const userBlockchains = userAddressItems.flatMap((a) => a.blockchains).filter((b, i, arr) => arr.indexOf(b) === i);

    return availableBlockchains
      ? userBlockchains.filter((b) => availableBlockchains.includes(b))
      : userBlockchains;
  }, [userAddressItems, availableBlockchains]);

  // Generate address items for dropdown
  const addressItems: AddressItem[] = useMemo(() => {
    if (userAddressItems.length === 0 || validBlockchains.length === 0) {
      return [];
    }

    const items: AddressItem[] = validBlockchains.flatMap((blockchain) => {
      const addressesForBlockchain = userAddressItems.filter((a) => a.blockchains.includes(blockchain));
      return addressesForBlockchain.map((a) => ({
        address: a.address,
        addressLabel: a.addressLabel,
        label: toString(blockchain),
        chain: blockchain,
      }));
    });

    // Add "Switch address" option
    items.push({
      addressLabel: translate('screens/buy', 'Switch address'),
      label: translate('screens/buy', 'Login with a different address'),
    });

    return items;
  }, [userAddressItems, validBlockchains, toString, translate]);

  return { addressItems, userSessions };
}
