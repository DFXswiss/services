interface StyledLinkProps {
  label: string;
  url?: string;
  dark?: boolean;
}

export function StyledLink({ label, url, dark }: StyledLinkProps): JSX.Element {
  return (
    <a
      className={`${dark ? 'text-dfxGray-800' : 'text-link opacity-30'}`}
      target="_blank"
      href={url}
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
