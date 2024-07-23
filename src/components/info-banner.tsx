import { InfoBanner, useSettings } from '@dfx.swiss/react';
import { DfxIcon, IconColor, IconVariant } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useStore } from 'src/hooks/store.hook';

export function InfoBannerComponent(): JSX.Element {
  const { infoBanner: infoBannerStore } = useStore();
  const { getInfoBanner } = useSettings();
  const { language } = useSettingsContext();

  const [bannerText, setBannerText] = useState<string>();

  useEffect(() => {
    if (language && infoBannerStore.get() === undefined) {
      getInfoBanner().then((infoBanner) => {
        setBannerText(infoBanner?.[language.symbol.toLowerCase() as keyof InfoBanner]);
      });
    }
  }, [language]);

  function closeBanner() {
    setBannerText(undefined);
    infoBannerStore.set('hidden');
  }

  return bannerText ? (
    <div className="flex flex-row justify-center items-center w-full p-3.5 bg-dfxRed-100">
      <p className="font-semibold text-sm px-8">{bannerText}</p>
      <div onClick={() => closeBanner()} className="absolute right-4">
        <DfxIcon icon={IconVariant.CLOSE} color={IconColor.WHITE} />
      </div>
    </div>
  ) : (
    <></>
  );
}
