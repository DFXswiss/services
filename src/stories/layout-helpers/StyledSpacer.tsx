import { convertToRem } from './LayoutFunctions';

export interface StyledSpacerProps {
  showLine?: boolean;
  spacing: number;
}

export default function StyledSpacer({ showLine, spacing }: StyledSpacerProps) {
  let spacerClasses = '';

  showLine ? (spacerClasses = ' border-t border-dfxGray-400') : null;

  const margin = convertToRem(spacing);

  return <div style={{ margin: margin + ' 0' }} className={spacerClasses}></div>;
}
