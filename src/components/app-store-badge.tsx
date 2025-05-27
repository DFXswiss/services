import { useMemo } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { BadgeType, getAppStoreBadge } from 'src/util/app-store-badges';

interface AppStoreBadgeProps {
  type: BadgeType;
  url?: string;
}

export function AppStoreBadge({ type, url }: AppStoreBadgeProps) {
  const { locale } = useSettingsContext();

  const badgeImage = useMemo(() => {
    const language = locale?.split('-')[0] || 'en';
    return getAppStoreBadge(type, language);
  }, [type, locale]);

  if (!url) return null;

  return (
    <button
      onClick={() => window.open(url, '_blank', 'noreferrer')}
      className="p-0 border-0 bg-transparent h-[50px]"
      type="button"
    >
      <img
        src={badgeImage}
        alt={type === BadgeType.APP_STORE ? 'Apple App Store' : 'Google Play Store'}
        className="h-full w-auto block"
      />
    </button>
  );
}
