import { DfxIcon, IconColor, IconVariant, StyledLink } from '@dfx.swiss/react-components';
import { HTMLAttributeAnchorTarget } from 'react';

interface NavigationLinkProps {
  icon: IconVariant;
  label: string;
  url?: string;
  target?: HTMLAttributeAnchorTarget;
}

export function NavigationLink({ icon, label, url, target }: NavigationLinkProps): JSX.Element {
  return (
    <div className="flex flex-row items-center space-x-2">
      <DfxIcon icon={icon} color={IconColor.RED} />
      <StyledLink label={label} url={url} target={target} dark />
    </div>
  );
}
