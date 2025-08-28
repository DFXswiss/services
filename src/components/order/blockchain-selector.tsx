import { Blockchain } from '@dfx.swiss/react';
import { StyledDropdown } from '@dfx.swiss/react-components';
import React from 'react';
import { Control } from 'react-hook-form';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useBlockchain } from 'src/hooks/blockchain.hook';

interface BlockchainSelectorProps {
  control: Control<any>;
  name: string;
  availableBlockchains: Blockchain[];
  selectedBlockchain?: Blockchain;
}

export const BlockchainSelector: React.FC<BlockchainSelectorProps> = ({
  control,
  name,
  availableBlockchains,
}) => {
  const { rootRef } = useLayoutContext();
  const { translate } = useSettingsContext();
  const { toString, toHeader } = useBlockchain();

  return (
    <StyledDropdown<Blockchain>
      control={control}
      rootRef={rootRef}
      name={name}
      placeholder={translate('general/actions', 'Select') + '...'}
      items={availableBlockchains}
      labelFunc={(blockchain) => toString(blockchain)}
      descriptionFunc={(blockchain) => toHeader(blockchain)}
      full
    />
  );
};