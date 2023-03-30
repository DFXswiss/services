import { useState } from 'react'; // import state
import logo from '../assets/logo.svg';
import menu from '../assets/menu.svg';
import { useLanguageContext } from '../contexts/language.context';

export function Navigation() {
  const { changeLanguage } = useLanguageContext();
  const [isNavigationOpen, setIsNavigationOpen] = useState(false); // initiate isNavOpen state with false

  return (
    <div className="flex items-center justify-between h-12 px-4 py-5 bg-dfxBlue-800">
      <a href="/">
        <img height={23} width={73.6} src={logo} alt="logo" />
      </a>
      <nav>
        <section className="flex">
          <div className="space-y-2" onClick={() => setIsNavigationOpen((prev) => !prev)}>
            <img height={24} width={24} src={menu} alt="logo" />
          </div>

          <div
            className={
              isNavigationOpen ? 'absolute top-0 right-0 h-screen w-4/5 flex flex-col bg-dfxBlue-800' : 'hidden'
            }
          >
            <div className="h-full w-full">
              <div
                className="w-full flex flex-row justify-end px-4 py-5 z-10"
                onClick={() => setIsNavigationOpen(false)} // change isNavOpen state to false to close the menu
              >
                <svg
                  className="h-4 w-4 text-gray-600"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="14" y1="2" x2="2" y2="14" />
                  <line x1="2" y1="2" x2="14" y2="14" />
                </svg>
              </div>
              <ul className="flex flex-col items-start px-8">
                <li className="">
                  <a href="/profile">Your data</a>
                </li>
                <li className="">
                  <a href="/faq">FAQ</a>
                </li>
                <li className="">
                  <a href={process.env.REACT_APP_DFX_URL}>DFX.swiss</a>
                </li>
                <li className="">
                  <a href="/">Telegram</a>
                </li>
                <li className="">
                  <a href="/bank-accounts">DFX bank accounts</a>
                </li>
                <li className="">
                  <a href={process.env.REACT_APP_TNC_URL}>Terms of Use</a>
                </li>
                <li className="">
                  <a href="/">Logout</a>
                </li>
                <li className="">
                  <div onClick={() => changeLanguage('en')}>EN</div>
                </li>
                <li className="">
                  <div onClick={() => changeLanguage('de')}>DE</div>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </nav>
    </div>
  );
}
