import { Asset, Fiat } from '@dfx.swiss/react';
import { AssetIconVariant } from '@dfx.swiss/react-components';
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { AssetDropdown, StyledAssetInput } from './styled-asset-input';

interface AssetInputSectionProps {
  name: string;
  label: string;
  placeholder: string;
  isColoredBackground?: boolean;
  availableItems: Asset[] | Fiat[];
  handleMaxButtonClick?: () => void;
  selectedCurrency?: Fiat;
  fiatRate?: number;
}

export const AssetInputSection: React.FC<AssetInputSectionProps> = ({
  name,
  label,
  placeholder,
  isColoredBackground = false,
  availableItems,
  handleMaxButtonClick,
  selectedCurrency,
  fiatRate,
}) => {
  const { control } = useFormContext();

  return (
    <StyledAssetInput
      type="number"
      name={`${name}Amount`}
      label={label}
      placeholder={placeholder}
      coloredBackground={isColoredBackground}
      maxButtonClick={handleMaxButtonClick}
      fiatRate={fiatRate}
      fiatCurrency={selectedCurrency?.name}
      assetSelector={
        <AssetDropdown<any>
          control={control}
          name={name}
          items={availableItems}
          labelFunc={(item) => item.name}
          descriptionFunc={(item) => item.description ?? item.name}
          balanceFunc={(_item) => (1.2).toFixed(2)} // TODO: Replace with actual balance
          priceFunc={(_item) => (1.3).toFixed(2)} // TODO: Replace with actual price
          assetIconFunc={(item) => item.name as AssetIconVariant}
          showSelectedValue={true}
        />
      }
    />
  );
};
