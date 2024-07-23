import { InfoBanner, useSettings } from '@dfx.swiss/react';
import { DfxIcon, IconColor, IconVariant } from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useStore } from 'src/hooks/store.hook';

export function InfoBannerComponent(): JSX.Element {
  const { infoBanner: infoBannerStore } = useStore();
  const { getInfoBanner } = useSettings();
  const { language } = useSettingsContext();

  const [infoBanner, setInfoBanner] = useState<InfoBanner>();

  useEffect(() => {
    getInfoBanner().then((infoBanner) => {
      if (JSON.stringify(infoBanner) === JSON.stringify(infoBannerStore.get())) return;
      setInfoBanner(infoBanner);
      infoBannerStore.remove();
    });
  }, []);

  function closeBanner() {
    setInfoBanner(undefined);
    infoBanner && infoBannerStore.set(infoBanner);
  }

  return infoBanner ? (
    <div className="flex flex-row justify-center items-center w-full p-3.5 bg-dfxRed-100">
      <p className="font-semibold text-sm px-8">
        {infoBanner?.[language?.symbol.toLowerCase() as keyof InfoBanner] ?? infoBanner?.en}
      </p>
      <div onClick={() => closeBanner()} className="absolute right-4 cursor-pointer">
        <DfxIcon icon={IconVariant.CLOSE} color={IconColor.WHITE} />
      </div>
    </div>
  ) : (
    <></>
  );
}
