const APP_STORE_BADGES = {
  en: '/badges/app-store-en.svg',
  de: '/badges/app-store-de.svg',
  fr: '/badges/app-store-fr.svg',
  it: '/badges/app-store-it.svg',
} as const;

const PLAY_STORE_BADGES = {
  en: '/badges/play-store-en.svg',
  de: '/badges/play-store-de.svg',
  fr: '/badges/play-store-fr.svg',
  it: '/badges/play-store-it.svg',
} as const;

export enum BadgeType {
  APP_STORE = 'appStore',
  PLAY_STORE = 'playStore',
}

type SupportedLocale = keyof typeof APP_STORE_BADGES;

export function getAppStoreBadge(type: BadgeType, locale: string): string {
  if (type === BadgeType.APP_STORE) {
    return APP_STORE_BADGES[locale as SupportedLocale] || APP_STORE_BADGES.en;
  } else {
    return PLAY_STORE_BADGES[locale as SupportedLocale] || PLAY_STORE_BADGES.en;
  }
}
