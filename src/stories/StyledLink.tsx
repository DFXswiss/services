interface StyledLinkProps {
  label: string;
  url?: string;
}

export function StyledLink({ label, url }: StyledLinkProps): JSX.Element {
  return (
    <a className="text-link opacity-30" target="_blank" href={url} rel="noopener noreferrer">
      {label}
    </a>
  );
}
