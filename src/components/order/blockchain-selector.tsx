import { Blockchain } from '@dfx.swiss/react';
import { StyledDropdown } from '@dfx.swiss/react-components';
import React from 'react';
import { Control } from 'react-hook-form';
import { useLayoutContext } from 'src/contexts/layout.context';
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
  const { toString, toHeader } = useBlockchain();

  return (
    <StyledDropdown<Blockchain>
      control={control}
      rootRef={rootRef}
      name={name}
      placeholder="Select blockchain..."
      items={availableBlockchains}
      labelFunc={(blockchain) => toString(blockchain)}
      descriptionFunc={(blockchain) => toHeader(blockchain)}
      full
    />
  );
};