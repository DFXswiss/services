import { InfoBanner, useSettings } from '@dfx.swiss/react';
import { DfxIcon, IconColor, IconVariant } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useStore } from 'src/hooks/store.hook';

const testBanner = { de: 'A new message DE', en: 'A new message EN', fr: 'A new message FR', it: 'A new message IT' };

export function InfoBannerComponent(): JSX.Element {
  const { infoBanner: infoBannerStore } = useStore();
  const { getInfoBanner } = useSettings();
  const { language } = useSettingsContext();

  const [bannerText, setBannerText] = useState<string>();
  const [hash, setHash] = useState<string | undefined>(infoBannerStore.get());

  useEffect(() => {
    if (language) {
      getInfoBanner().then((infoBanner) => {
        if (infoBanner?.en === hash) return;
        setBannerText(infoBanner?.[language.symbol.toLowerCase() as keyof InfoBanner] ?? infoBanner?.en);
        setHash(infoBanner?.en);
        infoBannerStore.remove();
      });
    }
  }, [language]);

  function closeBanner() {
    setBannerText(undefined);
    hash && infoBannerStore.set(hash);
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
