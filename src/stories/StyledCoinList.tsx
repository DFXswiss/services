import { PropsWithChildren } from 'react';

export interface StyledCoinListProps extends PropsWithChildren {
  heading: string;
}

export default function StyledCoinList({ heading, children }: StyledCoinListProps) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-dfxBlue-800 text-sm border-b border-dfxGray-400">{heading}</h3>
      <div className="grid gap-4 grid-cols-3 md:grid-cols-4 lg:grid-cols-5 my-3">{children}</div>
    </div>
  );
}
