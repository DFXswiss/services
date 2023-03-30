import { PropsWithChildren } from 'react';
import DfxIcon, { IconColors, IconSizes, IconVariant } from './DfxIcon';

interface StyledTabProps extends PropsWithChildren {
  setActive: () => any;
  active: boolean;
  deactivated?: boolean;
  icon?: IconVariant;
  flagWord1?: string;
  flagWord2?: string;
}

export default function StyledTab({
  children,
  active,
  setActive,
  deactivated = false,
  icon,
  flagWord1,
  flagWord2,
}: StyledTabProps) {
  let tabClasses = 'text-2xl font-black px-12 py-2 rounded-t-lg block flex gap-2 ';
  if (!deactivated) {
    active ? (tabClasses += 'bg-white') : (tabClasses += 'hover:bg-white/10 focus:bg-white/10');
  } else {
    tabClasses += 'cursor-default text-dfxBlue-800/70';
  }

  return (
    <li className="flex-none text-center ">
      <a
        className={tabClasses}
        onClick={(e) => {
          e.preventDefault();
          if (!deactivated) {
            setActive();
          }
        }}
        data-toggle="tab"
        href="#"
        role="tablist"
      >
        {children}

        {icon !== undefined && <IconFlag icon={icon} />}

        {flagWord1 !== undefined && <TwoWordFlag word1={flagWord1} word2={flagWord2} />}
      </a>
    </li>
  );
}

type TwoWordFlagProps = {
  word1: string | undefined;
  word2?: string;
};

function TwoWordFlag({ word1, word2 }: TwoWordFlagProps) {
  let flagClasses = 'text-2xs uppercase font-normal text-left leading-tight ';

  if (word2 !== undefined) {
    flagClasses += ' place-self-center';
  } else {
    flagClasses += ' place-self-start mt-2';
  }

  return (
    <div className={flagClasses}>
      {word1}
      {word2 !== undefined ? <br /> : null}
      {word2}
    </div>
  );
}

type IconFlagProps = {
  icon: IconVariant;
};

function IconFlag({ icon }: IconFlagProps) {
  return (
    <div className="place-self-center ml-1">
      <DfxIcon icon={icon} color={IconColors.BLUE} size={IconSizes.LG} />
    </div>
  );
}
