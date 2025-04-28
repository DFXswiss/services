import { DfxIcon, IconColor, IconSize, IconVariant } from '@dfx.swiss/react-components';
import React from 'react';

interface DirectionToggleButtonProps {
  onToggle: () => void;
}

export const DirectionToggleButton: React.FC<DirectionToggleButtonProps> = ({ onToggle }) => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-14 w-14">
      <button
        type="button"
        className="w-full h-full flex items-center justify-center bg-dfxGray-300 hover:bg-dfxGray-500 rounded-md border-[6px] border-white"
        onClick={onToggle}
      >
        <DfxIcon icon={IconVariant.ARROW_DOWN} size={IconSize.MD} color={IconColor.BLACK} />
      </button>
    </div>
  );
};
