import { Asset, Fiat } from '@dfx.swiss/react';
import { AssetIconVariant } from '@dfx.swiss/react-components';
import React, { useCallback, useMemo } from 'react';
import { RegisterOptions, useFormContext } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import StyledDropdown, { StyledAssetInput } from './styled-asset-input';

interface AssetInputSectionProps {
  name: string;
  label?: string;
  placeholder: string;
  isColoredBackground?: boolean;
  availableItems: Asset[] | Fiat[];
  selectedItem?: Asset | Fiat;
  exchangeRate?: number;
  amountRules?: RegisterOptions;
  assetRules?: RegisterOptions;
  hidden?: boolean;
  balanceFunc?: (asset: Asset) => string;
  onMaxButtonClick?: (value: number) => void;
  onAmountChange?: () => void;
}

export const AssetInputSection: React.FC<AssetInputSectionProps> = ({
  name,
  label,
  placeholder,
  isColoredBackground = false,
  availableItems,
  selectedItem,
  exchangeRate,
  amountRules,
  assetRules,
  hidden = false,
  balanceFunc,
  onMaxButtonClick,
  onAmountChange,
}) => {
  const { control } = useFormContext();
  const { translate } = useSettingsContext();

  const rootRef = React.useRef<HTMLDivElement>(null);

  if (hidden) return null;

  const isAsset = (item: Asset | Fiat): item is Asset => 'chainId' in item;

  const maxValue = useMemo(() => {
    if (!selectedItem || !balanceFunc) return undefined;
    return isAsset(selectedItem) ? balanceFunc(selectedItem) : undefined;
  }, [selectedItem, balanceFunc]);

  const handleMaxButtonClick = useCallback(() => {
    if (maxValue && onMaxButtonClick) {
      const value = parseFloat(maxValue);
      if (!isNaN(value)) onMaxButtonClick(value);
    }
  }, [maxValue, onMaxButtonClick]);

  return (
    <StyledAssetInput
      type="number"
      name={`${name}Amount`}
      label={label}
      placeholder={placeholder}
      coloredBackground={isColoredBackground}
      rules={amountRules}
      maxValue={maxValue ? `${maxValue} ${selectedItem?.name}` : undefined}
      onMaxButtonClick={handleMaxButtonClick}
      onAmountChange={onAmountChange}
      // fiatRate={exchangeRate} // TODO: Handle fiat rate display
      // fiatCurrency={selectedItem?.name} // TODO: Handle fiat currency display
      assetSelector={
        <StyledDropdown<Asset | Fiat>
          rootRef={rootRef}
          control={control}
          name={name}
          items={availableItems}
          labelFunc={(item) => item.name}
          descriptionFunc={(item: any) => item.description ?? item.name}
          assetIconFunc={(item) => item.name as AssetIconVariant}
          placeholder={translate('general/actions', 'Select') + '...'}
          rules={assetRules}
        />
      }
    />
  );
};
