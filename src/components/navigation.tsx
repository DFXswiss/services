import { PropsWithChildren, useEffect, useState } from 'react';
import logo from '../static/assets/logo.svg';
import { ReactComponent as MenuIcon }  from '../static/assets/menu.svg';
import { ReactComponent as CloseIcon }  from '../static/assets/close.svg';
import { useLanguageContext } from '../contexts/language.context';
import { useAuthContext } from '@dfx.swiss/react';
import { NavigationLink } from './navigation-link';
import { NavigationBack } from './navigation-back';
import { useIframe } from '../hooks/iframe.hook';
import { AppPage } from '../contexts/app-handling.context';
import { Form, StyledDropdown } from '@dfx.swiss/react-components';
import { useForm, useWatch } from 'react-hook-form';
import { Language } from '../definitions/language';

interface FormData {
  language: Language;
}

interface NavigationIframeProps extends PropsWithChildren {
  backTitle?: string;
  appPage?: AppPage;
}

export function Navigation({ backTitle, appPage }: NavigationIframeProps) {
  const { translate } = useLanguageContext();
  const { authenticationToken } = useAuthContext();
  const { language, availableLanguages, changeLanguage } = useLanguageContext();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const { checkIfUsedByIframe } = useIframe();
  const [isUsedByIframe] = useState(checkIfUsedByIframe);

  const {
    control,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { language: language }});
  const formData = useWatch({ control, name: "language" });

  useEffect(() => {
    changeLanguage(formData);
  }, [formData]);

  const bgColor = isUsedByIframe ? 'bg-dfxGray-300' : 'bg-dfxBlue-800';
  const svgColor = isUsedByIframe ? '#0A355C' : '#ffffff'

  function displayBrowserFirstLine(): JSX.Element {
    return (
      <a href="/">
        <img height={23} width={73.6} src={logo} alt="logo" />
      </a>
    );
  }

  function displayBrowserSecondLine({ backTitle, appPage }: NavigationIframeProps): JSX.Element {
    return (
      <>
        {backTitle && <NavigationBack title={backTitle} appPage={appPage} />}
      </>
    );
  }

  function displayIframeFirstLine({ backTitle }: NavigationIframeProps): JSX.Element {
    return (
      <div className="w-full pl-8">
        {<NavigationBack title={backTitle ?? translate('screens/home', 'DFX services')} />}
      </div>
    );
  }

  function displayIframeSecondLine(): JSX.Element {
    return (<></>);
  }

  function displayMenuIcon(): JSX.Element {
    return (
      <div className="space-y-2 w-6 h-6 cursor-pointer" onClick={() => setIsNavigationOpen((prev) => !prev)}>
        <MenuIcon fill={svgColor} />
      </div>
    )
  }

  function displayCloseIcon(): JSX.Element {
    return (
      <div className="space-y-2 px-1 w-6 h-4 cursor-pointer" onClick={() => setIsNavigationOpen((prev) => !prev)}>
        <CloseIcon color={svgColor} />
      </div>
    );
  }

  function displayNavigationMenu(): JSX.Element {
    return (
      <>
        { displayCloseIcon() }

        <div className="absolute top-14 right-2 border-1 drop-shadow-md w-64 z-10 flex flex-col bg-dfxGray-300">
          <div className="mx-4 py-4 text-dfxGray-800">
            {authenticationToken && (
              <NavigationLink label={translate('navigation/links', 'My DFX')} url={`${process.env.REACT_APP_PAY_URL}login?token=${authenticationToken}`} />
            )}
            <NavigationLink label={translate('navigation/links', 'Terms and conditions')} url={process.env.REACT_APP_TNC_URL} />
            <NavigationLink label={translate('navigation/links', 'Privacy policy')} url={process.env.REACT_APP_PPO_URL} />
            <NavigationLink label={translate('navigation/links', 'Imprint')} url={process.env.REACT_APP_IMP_URL} />

            <Form control={control} errors={errors}>
              <StyledDropdown
                name="language"
                label=''
                placeholder={translate('general/actions', 'Please select...')}
                items={Object.values(availableLanguages)}
                labelFunc={(item) => item.name}
                descriptionFunc={(item) => item.foreignName}
              />
            </Form>
          </div>
        </div>
      </>
    );    
  }

  return (
    <>
    <div className={`flex items-center justify-between h-12 px-4 py-5 ${bgColor}`}>
      { isUsedByIframe? displayIframeFirstLine({backTitle}) : displayBrowserFirstLine() }

      <nav>
        <section className="flex">
          { isNavigationOpen ? displayNavigationMenu() : displayMenuIcon() }
        </section>
      </nav>
    </div>

    { isUsedByIframe? displayIframeSecondLine() : displayBrowserSecondLine({backTitle, appPage}) }
    </>
  );
}
