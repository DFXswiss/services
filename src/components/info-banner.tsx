import { InfoBanner } from '@dfx.swiss/react';
import { DfxIcon, IconColor, IconVariant } from '@dfx.swiss/react-components';
import { useSettingsContext } from 'src/contexts/settings.context';

export function InfoBannerComponent(): JSX.Element {
  const { language } = useSettingsContext();
  const { infoBanner, closeInfoBanner } = useSettingsContext();

  return infoBanner ? (
    <div className="flex flex-row justify-center items-center w-full p-3.5 bg-dfxRed-100">
      <p className="font-semibold text-sm px-8">
        {infoBanner?.[language?.symbol.toLowerCase() as keyof InfoBanner] ?? infoBanner?.en}
      </p>
      <div onClick={() => closeInfoBanner()} className="absolute right-4 cursor-pointer">
        <DfxIcon icon={IconVariant.CLOSE} color={IconColor.WHITE} />
      </div>
    </div>
  ) : (
    <></>
  );
}
