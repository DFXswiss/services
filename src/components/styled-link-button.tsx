import { StyledButtonWidth } from '@dfx.swiss/react-components';
import React from 'react';

interface StyledLinkButtonProps {
  label: string;
  href: string;
  isLoading?: boolean;
  width?: StyledButtonWidth;
}

export function StyledLinkButton({ label, href, isLoading, width = StyledButtonWidth.FULL }: StyledLinkButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isLoading || href?.includes('/pos/payment-link/')) {
      e.preventDefault();
    }
  };

  return (
    <a
      href={href || '#'}
      onClick={handleClick}
      className={`
        inline-flex gap-4 justify-center items-center
        font-bold text-base rounded px-7 py-2.5
        ${width === StyledButtonWidth.FULL ? 'w-full' : 'min-w-62.5'}
        text-dfxBlue-800 bg-white/10
        border border-dfxGray-600
        shadow-md leading-tight
        hover:bg-white/20 focus:bg-white/20 active:bg-white/30
        focus:outline-none focus:ring-0
        transition duration-150 ease-in-out
        ${isLoading ? 'cursor-wait bg-dfxGray-800 text-dfxGray-700 border-dfxGray-700' : 'cursor-pointer'}
      `}
      target="_blank"
      rel="noopener noreferrer"
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dfxBlue-800 mr-2"></div>
          {label.toUpperCase()}
        </div>
      ) : (
        label.toUpperCase()
      )}
    </a>
  );
}
