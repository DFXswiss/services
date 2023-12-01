import { DfxIcon, IconColor, IconVariant, StyledLink } from '@dfx.swiss/react-components';
import { HTMLAttributeAnchorTarget } from 'react';
import { useNavigation } from '../hooks/navigation.hook';
import { isAbsoluteUrl } from '../util/utils';

interface NavigationLinkProps {
  icon: IconVariant;
  label: string;
  url?: string;
  target?: HTMLAttributeAnchorTarget;
}

export function NavigationLink({ icon, label, url, target }: NavigationLinkProps): JSX.Element {
  const { navigate } = useNavigation();

  const actionProp = url && (isAbsoluteUrl(url) ? { url } : { onClick: () => navigate(url) });

  return (
    <div className="flex flex-row items-center space-x-2">
      <DfxIcon icon={icon} color={IconColor.RED} />
      <StyledLink label={label} {...actionProp} target={target} dark />
    </div>
  );
}
