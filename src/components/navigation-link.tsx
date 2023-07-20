import { DfxIcon, IconColor, IconVariant, StyledLink } from '@dfx.swiss/react-components';

interface NavigationLinkProps {
  label: string;
  url?: string;
}

export function NavigationLink({ label, url }: NavigationLinkProps): JSX.Element {
  return (
    <div className="flex flex-row space-x-2">
      <DfxIcon icon={IconVariant.OPEN_IN_NEW} color={IconColor.RED} />
      <StyledLink label={label} url={url} dark />
    </div>
  );
}
