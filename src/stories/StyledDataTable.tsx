import { PropsWithChildren, createContext } from 'react';

export interface StyledDataTableProps extends PropsWithChildren {
  darkTheme?: boolean;
  heading?: string;
  label?: string;
  showBorder?: boolean;
  alignContent?: AlignContent;
  narrow?: boolean;
  minWidth?: boolean;
}

export enum AlignContent {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  BETWEEN = 'BETWEEN',
}

const contextProps = {
  darkTheme: true,
  showBorder: true,
  alignContent: AlignContent.LEFT,
  narrow: false,
  minWidth: true,
};
export const ThemeContext = createContext(contextProps);

export default function StyledDataTable({
  showBorder = true,
  heading,
  label,
  darkTheme = false,
  children,
  alignContent = AlignContent.LEFT,
  narrow = false,
  minWidth = true,
}: StyledDataTableProps) {
  let headingClasses = 'text-lg font-bold mb-2.5';
  let labelClasses = 'font-semibold text-sm mb-1.5 ml-3.5';

  if (!darkTheme) {
    labelClasses += ' text-dfxBlue-800';
    headingClasses += ' text-dfxBlue-800';
  }
  showBorder ? (headingClasses += ' ml-3.5') : (headingClasses += ' ');
  return (
    <ThemeContext.Provider value={{ darkTheme, showBorder, alignContent, narrow, minWidth }}>
      <div className={`mb-2.5 ${minWidth ? '' : 'w-full'}`}>
        {heading !== undefined && <h3 className={headingClasses}>{heading}</h3>}
        {label !== undefined && showBorder && <p className={labelClasses}>{label}</p>}
        <div>{children}</div>
      </div>
    </ThemeContext.Provider>
  );
}
