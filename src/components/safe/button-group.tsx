export enum ButtonGroupSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
}

interface ButtonGroupProps<T> {
  items: T[];
  selected: T;
  onClick: (item: T) => void;
  buttonLabel: (item: T) => string;
  size?: ButtonGroupSize;
}

export const ButtonGroup = <T extends React.ReactNode>({
  items,
  selected,
  onClick,
  buttonLabel,
  size = ButtonGroupSize.MD,
}: ButtonGroupProps<T>) => {
  const getButtonStyles = (item: T): string => {
    const padding =
      size === ButtonGroupSize.LG ? 'px-4 py-3' : size === ButtonGroupSize.SM ? 'px-2.5 py-2' : 'px-3 py-2.5';
    const baseStyles = `btn ${padding} leading-none text-sm font-medium transition-all duration-300`;
    return item === selected
      ? `${baseStyles} bg-dfxBlue-800/15 text-dfxBlue-800`
      : `${baseStyles} bg-dfxBlue-800/5 text-dfxBlue-800/40 hover:text-dfxBlue-800 hover:bg-dfxBlue-800/15`;
  };

  return (
    <div className="z-10 w-min bg-white/80 rounded-md overflow-clip flex flex-row justify-center items-center">
      {items.map((item, index) => (
        <button key={`button-group-${index}`} className={getButtonStyles(item)} onClick={() => onClick(item)}>
          {buttonLabel(item)}
        </button>
      ))}
    </div>
  );
};
