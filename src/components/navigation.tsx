import { Language, useAuthContext } from '@dfx.swiss/react';
import { DfxIcon, Form, IconColor, IconSize, IconVariant, StyledDropdown } from '@dfx.swiss/react-components';
import { PropsWithChildren, SetStateAction, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useIframe } from '../hooks/iframe.hook';
import { useNavigation } from '../hooks/navigation.hook';
import logo from '../static/assets/logo-dark.svg';
import { NavigationLink } from './navigation-link';

interface FormData {
  language: Language;
}

interface NavigationIframeProps extends PropsWithChildren {
  title?: string;
  backButton?: boolean;
}

interface IconContentProps {
  icon: IconVariant;
  setIsNavigationOpen: (value: SetStateAction<boolean>) => void;
}

interface NavigationMenuContentProps {
  setIsNavigationOpen: (value: SetStateAction<boolean>) => void;
}

export function Navigation({ title, backButton = true }: NavigationIframeProps): JSX.Element {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const { isUsedByIframe } = useIframe();

  return title || !isUsedByIframe ? (
    <div className={`flex items-center justify-between h-12 px-4 py-5 bg-dfxGray-300`}>
      <BackButton title={title} backButton={backButton} />

      <div className="absolute right-4">
        <MenuIcon
          icon={isNavigationOpen ? IconVariant.CLOSE : IconVariant.MENU}
          setIsNavigationOpen={setIsNavigationOpen}
        />
      </div>

      {isNavigationOpen && <NavigationMenu setIsNavigationOpen={setIsNavigationOpen} />}
    </div>
  ) : (
    <></>
  );
}

function BackButton({ title, backButton }: NavigationIframeProps): JSX.Element {
  const { homePath } = useSettingsContext();
  const { closeServices } = useAppHandlingContext();
  const location = useLocation();
  const { navigate } = useNavigation();
  const { isUsedByIframe } = useIframe();

  function onClick() {
    if (homePath === location.pathname) {
      closeServices({ type: CloseType.CANCEL });
    } else {
      navigate(-1);
    }
  }

  return (
    <button
      type="button"
      className="text-dfxBlue-800 font-bold text-lg flex flex-row flex-grow flex-shrink-0 items-center justify-center"
      onClick={() => onClick()}
      disabled={!backButton}
    >
      <div className="absolute left-4">
        {backButton ? (
          <div className="ml-2">
            <DfxIcon icon={IconVariant.BACK} color={IconColor.BLUE} size={IconSize.LG} />
          </div>
        ) : (
          !isUsedByIframe && <DfxLogo />
        )}
      </div>
      {title}
    </button>
  );
}

function DfxLogo(): JSX.Element {
  return (
    <a href="/">
      <img height={23} width={73.6} src={logo} alt="logo" />
    </a>
  );
}

function MenuIcon({ icon, setIsNavigationOpen }: IconContentProps): JSX.Element {
  return (
    <div className="cursor-pointer" onClick={() => setIsNavigationOpen((prev) => !prev)}>
      <DfxIcon icon={icon} size={IconSize.LG} color={IconColor.BLUE} />
    </div>
  );
}

function NavigationMenu({ setIsNavigationOpen }: NavigationMenuContentProps): JSX.Element {
  const { translate } = useSettingsContext();
  const { authenticationToken } = useAuthContext();
  const { language, availableLanguages, changeLanguage } = useSettingsContext();

  const {
    control,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { language } });
  const selectedLanguage = useWatch({ control, name: 'language' });

  useEffect(() => {
    if (selectedLanguage.id !== language?.id) {
      changeLanguage(selectedLanguage);
      setIsNavigationOpen(false);
    }
  }, [selectedLanguage]);

  return (
    <nav>
      <div className="absolute top-14 right-2 border-1 drop-shadow-md w-64 z-20 flex flex-col bg-dfxGray-300">
        <div className="mx-4 py-4 text-dfxGray-800">
          {authenticationToken && (
            <NavigationLink
              icon={IconVariant.HOME}
              label={translate('navigation/links', 'My DFX')}
              url={`${process.env.REACT_APP_PAY_URL}login?token=${authenticationToken}`}
            />
          )}
          <NavigationLink
            icon={IconVariant.FILE}
            label={translate('navigation/links', 'Terms and conditions')}
            url={process.env.REACT_APP_TNC_URL}
          />
          <NavigationLink
            icon={IconVariant.OPEN_IN_NEW}
            label={translate('navigation/links', 'Privacy policy')}
            url={process.env.REACT_APP_PPO_URL}
          />
          <NavigationLink
            icon={IconVariant.OPEN_IN_NEW}
            label={translate('navigation/links', 'Imprint')}
            url={process.env.REACT_APP_IMP_URL}
          />

          <Form control={control} errors={errors}>
            <StyledDropdown
              name="language"
              label=""
              placeholder={translate('general/actions', 'Please select...')}
              items={Object.values(availableLanguages)}
              labelFunc={(item) => item.name}
              descriptionFunc={(item) => item.foreignName}
            />
          </Form>
        </div>
      </div>
    </nav>
  );
}
