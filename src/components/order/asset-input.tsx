import { Asset, Fiat } from '@dfx.swiss/react';
import { AssetIconVariant, StyledDropdown } from '@dfx.swiss/react-components';
import React, { useCallback, useMemo } from 'react';
import { Control, RegisterOptions } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import { ExchangeRate } from 'src/dto/order.dto';
import { isAsset } from 'src/util/utils';
import { AssetInputControl } from './asset-input-control';

interface AssetInputProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder: string;
  isColoredBackground?: boolean;
  availableItems: Asset[] | Fiat[];
  selectedItem?: Asset | Fiat;
  amountRules?: RegisterOptions;
  assetRules?: RegisterOptions;
  hidden?: boolean;
  forceErrorMessage?: string;
  exchangeRate?: ExchangeRate;
  balanceFunc?: (asset: Asset) => string;
  onMaxButtonClick?: (value: number) => void;
  onAmountChange?: () => void;
}

export const AssetInput: React.FC<AssetInputProps> = ({
  control,
  name,
  label,
  placeholder,
  isColoredBackground,
  availableItems,
  selectedItem,
  amountRules,
  assetRules,
  hidden,
  forceErrorMessage,
  exchangeRate,
  balanceFunc,
  onMaxButtonClick,
  onAmountChange,
}) => {
  const { translate } = useSettingsContext();

  const rootRef = React.useRef<HTMLDivElement>(null);

  if (hidden) return null;

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
      control={control}
      type="number"
      name={name.replace('Asset', 'Amount')}
      label={label}
      placeholder={placeholder}
      coloredBackground={isColoredBackground}
      rules={amountRules}
      maxValue={maxValue && Number(maxValue) > 0 ? `${maxValue} ${selectedItem?.name}` : undefined}
      onMaxButtonClick={handleMaxButtonClick}
      onAmountChange={onAmountChange}
      forceErrorMessage={forceErrorMessage}
      exchangeRate={exchangeRate}
      isFiat={selectedItem && !isAsset(selectedItem)}
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
