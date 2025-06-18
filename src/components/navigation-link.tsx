import { DfxIcon, IconColor, IconVariant, StyledLink } from '@dfx.swiss/react-components';
import { HTMLAttributeAnchorTarget } from 'react';
import { useNavigation } from '../hooks/navigation.hook';
import { isAbsoluteUrl } from '../util/utils';

interface NavigationLinkProps {
  icon: IconVariant;
  label: string;
  url?: string;
  target?: HTMLAttributeAnchorTarget;
  onClose: () => void;
}

export function NavigationLink({ icon, label, url, target, onClose }: NavigationLinkProps): JSX.Element {
  const { navigate } = useNavigation();

  const handleClick = () => {
    if (url && !isAbsoluteUrl(url)) navigate(url);
    onClose();
  };

  const actionProp = url && (isAbsoluteUrl(url) ? { url, onClick: onClose } : { onClick: handleClick });

  return (
    <div className="flex flex-row items-center space-x-2">
      <DfxIcon icon={icon} color={IconColor.RED} />
      <StyledLink label={label} {...actionProp} target={target} dark />
    </div>
  );
}
