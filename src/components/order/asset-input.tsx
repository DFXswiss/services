import { Asset, Fiat } from '@dfx.swiss/react';
import { AssetIconVariant } from '@dfx.swiss/react-components';
import React, { useCallback, useMemo } from 'react';
import { RegisterOptions, useFormContext } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import StyledDropdown, { AssetInputControl } from './asset-input-control';

interface AssetInputProps {
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

export const AssetInput: React.FC<AssetInputProps> = ({
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
    <AssetInputControl
      type="number"
      name={name.replace('Asset', 'Amount')}
      label={label}
      placeholder={placeholder}
      coloredBackground={isColoredBackground}
      rules={amountRules}
      maxValue={maxValue && Number(maxValue) > 0 ? `${maxValue} ${selectedItem?.name}` : undefined}
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
