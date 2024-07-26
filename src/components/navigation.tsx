import { Language, useAuthContext, useSessionContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  Form,
  IconColor,
  IconSize,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDropdown,
} from '@dfx.swiss/react-components';
import { PropsWithChildren, SetStateAction, forwardRef, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { CloseType, useAppHandlingContext } from '../contexts/app-handling.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useNavigation } from '../hooks/navigation.hook';
import { NavigationLink } from './navigation-link';

interface FormData {
  language: Language;
}

interface BackButtonProps extends PropsWithChildren {
  onBack?: () => void;
}

interface NavigationIframeProps extends BackButtonProps {
  title?: string;
  backButton?: boolean;
  isOpen: boolean;
  setIsOpen: (value: SetStateAction<boolean>) => void;
}

interface IconContentProps {
  icon: IconVariant;
  setIsNavigationOpen: (value: SetStateAction<boolean>) => void;
}

interface NavigationMenuContentProps {
  setIsNavigationOpen: (value: SetStateAction<boolean>) => void;
}

export const Navigation = forwardRef<HTMLDivElement, NavigationIframeProps>(
  ({ title, backButton = true, onBack, isOpen, setIsOpen }: NavigationIframeProps, ref): JSX.Element => {
    const { params, isEmbedded } = useAppHandlingContext();

    return title || !isEmbedded ? (
      <div
        className={`flex w-full h-12 px-4 py-5 items-center justify-center ${
          params.headless !== 'true' ? 'relative bg-dfxGray-300' : ''
        }`}
        ref={ref}
      >
        {params.headless !== 'true' && (
          <>
            {backButton && <BackButton onBack={onBack} />}
            {title ? (
              <div className="text-dfxBlue-800 font-bold text-lg mx-8 line-clamp-1 select-none">{title}</div>
            ) : (
              !isEmbedded && <DfxLogo />
            )}
          </>
        )}

        <div className="absolute right-4 z-10">
          <MenuIcon icon={isOpen ? IconVariant.CLOSE : IconVariant.MENU} setIsNavigationOpen={setIsOpen} />
        </div>

        {isOpen && <NavigationMenu setIsNavigationOpen={setIsOpen} />}
      </div>
    ) : (
      <></>
    );
  },
);

function BackButton({ onBack }: BackButtonProps): JSX.Element {
  const { closeServices } = useAppHandlingContext();
  const { pathname } = useLocation();
  const { navigate } = useNavigation();

  function onClick() {
    if (pathname === '/') {
      closeServices({ type: CloseType.CANCEL }, false);
    } else {
      navigate(-1);
    }
  }

  return (
    <button className="absolute left-4 pl-2" onClick={onBack ?? onClick}>
      <DfxIcon icon={IconVariant.BACK} color={IconColor.BLUE} size={IconSize.LG} />
    </button>
  );
}

function DfxLogo(): JSX.Element {
  return (
    <a href="/">
      <img height={23} width={73.6} src="https://content.dfx.swiss/img/v1/website/logo-dark.svg" alt="logo" />
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
  const { navigate } = useNavigation();
  const { authenticationToken, session } = useAuthContext();
  const { translate, language, availableLanguages, changeLanguage } = useSettingsContext();
  const { isLoggedIn, logout: apiLogout } = useSessionContext();

  const {
    control,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { language } });
  const selectedLanguage = useWatch({ control, name: 'language' });

  useEffect(() => {
    if (selectedLanguage?.id !== language?.id) {
      changeLanguage(selectedLanguage);
      setIsNavigationOpen(false);
    }
  }, [selectedLanguage]);

  async function login() {
    navigate('/login');
    setIsNavigationOpen(false);
  }

  async function logout() {
    await apiLogout();
    setIsNavigationOpen(false);
  }

  return (
    <nav>
      <div className="absolute top-14 right-2 border-1 drop-shadow-md w-64 z-20 flex flex-col bg-dfxGray-300">
        <div className="mx-4 py-4 text-dfxGray-800">
          <NavigationLink
            icon={IconVariant.BANK}
            label={translate('navigation/links', 'Buy')}
            url="/buy"
            target="_self"
          />
          <NavigationLink
            icon={IconVariant.SELL}
            label={translate('navigation/links', 'Sell')}
            url="/sell"
            target="_self"
          />
          <NavigationLink
            icon={IconVariant.SWAP}
            label={translate('navigation/links', 'Swap')}
            url="/swap"
            target="_self"
          />
          <NavigationLink
            icon={IconVariant.ACCOUNT}
            label={translate('screens/home', 'Account')}
            url="/account"
            target="_self"
          />
          <NavigationLink
            icon={IconVariant.TRANSACTIONS}
            label={translate('screens/payment', 'Transactions')}
            url="/tx"
            target="_self"
          />
          <NavigationLink
            icon={IconVariant.KYC}
            label={translate('navigation/links', 'KYC')}
            url="/kyc"
            target="_self"
          />
          <NavigationLink
            icon={IconVariant.SETTINGS}
            label={translate('navigation/links', 'My DFX')}
            url={
              authenticationToken && session?.address
                ? `${process.env.REACT_APP_PAY_URL}login?token=${authenticationToken}`
                : '/my-dfx'
            }
            target={authenticationToken ? '_blank' : '_self'}
          />
          <NavigationLink
            icon={IconVariant.HOME}
            label={translate('navigation/links', 'DFX.swiss')}
            url={process.env.REACT_APP_DFX_URL}
          />
          <NavigationLink
            icon={IconVariant.SUPPORT}
            label={translate('navigation/links', 'Support')}
            url="/support"
            target="_self"
          />
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

          <div className="mt-4">
            <Form control={control} errors={errors}>
              <StyledDropdown
                name="language"
                label=""
                placeholder={translate('general/actions', 'Select...')}
                items={Object.values(availableLanguages)}
                labelFunc={(item) => item.name}
                descriptionFunc={(item) => item.foreignName}
              />
            </Form>
          </div>

          <StyledButton
            className="mt-4"
            label={translate('general/actions', isLoggedIn ? 'Logout' : 'Login')}
            onClick={isLoggedIn ? logout : login}
            color={StyledButtonColor.STURDY_WHITE}
            width={StyledButtonWidth.FULL}
          />
        </div>
      </div>
    </nav>
  );
}
