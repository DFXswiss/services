const BASE_URL = 'https://dfx.swiss/images/app';

export enum BadgeType {
  APP_STORE = 'appStore',
  PLAY_STORE = 'playStore',
}

export function getAppStoreBadge(type: BadgeType, locale: string): string {
  if (type === BadgeType.APP_STORE) {
    return appStoreBadgeUrl(locale);
  } else {
    return playStoreBadgeUrl(locale);
  }
}

const appStoreBadgeUrl = (locale: string): string => {
  return `${BASE_URL}/app-store_${locale}.svg`;
};

const playStoreBadgeUrl = (locale: string): string => {
  return `${BASE_URL}/play-store_${locale}.svg`;
};
