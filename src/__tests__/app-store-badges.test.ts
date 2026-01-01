import { BadgeType, getAppStoreBadge } from '../util/app-store-badges';

describe('app-store-badges', () => {
  describe('BadgeType enum', () => {
    it('should have APP_STORE value', () => {
      expect(BadgeType.APP_STORE).toBe('appStore');
    });

    it('should have PLAY_STORE value', () => {
      expect(BadgeType.PLAY_STORE).toBe('playStore');
    });
  });

  describe('getAppStoreBadge', () => {
    describe('App Store badges', () => {
      it('should return correct URL for English locale', () => {
        const url = getAppStoreBadge(BadgeType.APP_STORE, 'en');
        expect(url).toBe('https://dfx.swiss/images/app/app-store_en.svg');
      });

      it('should return correct URL for German locale', () => {
        const url = getAppStoreBadge(BadgeType.APP_STORE, 'de');
        expect(url).toBe('https://dfx.swiss/images/app/app-store_de.svg');
      });

      it('should return correct URL for French locale', () => {
        const url = getAppStoreBadge(BadgeType.APP_STORE, 'fr');
        expect(url).toBe('https://dfx.swiss/images/app/app-store_fr.svg');
      });

      it('should return correct URL for Italian locale', () => {
        const url = getAppStoreBadge(BadgeType.APP_STORE, 'it');
        expect(url).toBe('https://dfx.swiss/images/app/app-store_it.svg');
      });
    });

    describe('Play Store badges', () => {
      it('should return correct URL for English locale', () => {
        const url = getAppStoreBadge(BadgeType.PLAY_STORE, 'en');
        expect(url).toBe('https://dfx.swiss/images/app/play-store_en.svg');
      });

      it('should return correct URL for German locale', () => {
        const url = getAppStoreBadge(BadgeType.PLAY_STORE, 'de');
        expect(url).toBe('https://dfx.swiss/images/app/play-store_de.svg');
      });

      it('should return correct URL for French locale', () => {
        const url = getAppStoreBadge(BadgeType.PLAY_STORE, 'fr');
        expect(url).toBe('https://dfx.swiss/images/app/play-store_fr.svg');
      });
    });

    it('should handle any locale string', () => {
      const url = getAppStoreBadge(BadgeType.APP_STORE, 'es');
      expect(url).toBe('https://dfx.swiss/images/app/app-store_es.svg');
    });

    it('should use correct base URL', () => {
      const appStoreUrl = getAppStoreBadge(BadgeType.APP_STORE, 'en');
      const playStoreUrl = getAppStoreBadge(BadgeType.PLAY_STORE, 'en');
      
      expect(appStoreUrl).toContain('https://dfx.swiss/images/app/');
      expect(playStoreUrl).toContain('https://dfx.swiss/images/app/');
    });
  });
});
