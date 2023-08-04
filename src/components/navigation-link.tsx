import { DfxIcon, IconColor, IconVariant, StyledLink } from '@dfx.swiss/react-components';

interface NavigationLinkProps {
  icon: IconVariant;
  label: string;
  url?: string;
}

export function NavigationLink({ icon, label, url }: NavigationLinkProps): JSX.Element {
  return (
    <div className="flex flex-row items-center space-x-2">
      <DfxIcon icon={icon} color={IconColor.RED} />
      <StyledLink label={label} url={url} dark />
    </div>
  );
}
