import { PropsWithChildren } from 'react';
import { convertToRem } from './LayoutFunctions';

export interface StyledHorizontalStackProps extends PropsWithChildren {
  gap?: number;
  spanAcross?: boolean;
  marginX?: number;
  marginY?: number;
}

export default function StyledHorizontalStack({
  children,
  gap = 0,
  spanAcross,
  marginY,
  marginX,
}: StyledHorizontalStackProps) {
  let mY: string | undefined;
  let mX: string | undefined;

  const spacing = convertToRem(gap);
  marginY !== undefined ? (mY = convertToRem(marginY)) : (mY = '0');
  marginX !== undefined ? (mX = convertToRem(marginX)) : (mX = '0');

  let classNames = 'flex';

  spanAcross ? (classNames += ' justify-between') : null;

  return (
    <div style={{ gap: spacing, margin: mY + ' ' + mX }} className={classNames}>
      {children}
    </div>
  );
}
