interface Props {
  value: string;
  max: number;
}

export function CharRemainingHint({ value, max }: Readonly<Props>): JSX.Element {
  const remaining = max - value.length;
  const isAtLimit = remaining === 0;
  return (
    <div className={`text-[10px] text-right ${isAtLimit ? 'text-dfxRed-100' : 'text-dfxGray-700'}`}>
      noch {remaining} Zeichen
    </div>
  );
}
