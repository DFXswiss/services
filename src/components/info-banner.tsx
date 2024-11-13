import { InfoBanner } from '@dfx.swiss/react';
import { DfxIcon, IconColor, IconVariant } from '@dfx.swiss/react-components';
import { useSettingsContext } from 'src/contexts/settings.context';

interface InfoBannerComponentProps {
  bannerText?: string;
  buttonLabel?: string;
  onClick?: () => void;
}

export function InfoBannerComponent({ bannerText, buttonLabel, onClick }: InfoBannerComponentProps) {
  const { language } = useSettingsContext();
  const { infoBanner, closeInfoBanner } = useSettingsContext();

  const onButtonClick = () => {
    onClick ? onClick() : closeInfoBanner();
  };

  return infoBanner || bannerText ? (
    <div className="flex flex-row justify-center items-center w-full p-3.5 bg-dfxBlue-800">
      <p className="font-semibold text-sm px-8">
        {bannerText ?? infoBanner?.[language?.symbol.toLowerCase() as keyof InfoBanner] ?? infoBanner?.en}
      </p>
      <div onClick={() => onButtonClick()} className="absolute right-4 font-semibold text-sm cursor-pointer">
        {buttonLabel ?? <DfxIcon icon={IconVariant.CLOSE} color={IconColor.WHITE} />}
      </div>
    </div>
  ) : (
    <></>
  );
}
