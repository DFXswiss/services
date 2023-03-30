import DfxIcon, { IconVariant, IconColors, IconSizes } from './DfxIcon';

export interface StyledIconButtonProps {
  onClick: () => void;
  size?: IconSizes;
  icon: IconVariant;
  color?: IconColors;
  inline?: boolean;
}

export default function StyledIconButton({
  onClick,
  size = IconSizes.MD,
  icon,
  inline = false,
  color = IconColors.RED,
}: StyledIconButtonProps) {
  let buttonClass = 'inline-block h-full align-top';
  inline ? (buttonClass += ' px-2 pt-0.5') : null;
  return (
    <button type="button" className={buttonClass} onClick={onClick}>
      <DfxIcon icon={icon} color={color} size={size} />
    </button>
  );
}
