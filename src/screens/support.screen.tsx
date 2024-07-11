import { DfxIcon, IconColor, IconVariant, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useRef, useState } from 'react';
import { FaTelegram } from 'react-icons/fa';
import { IoMdHelpCircle } from 'react-icons/io';
import { MdEditSquare } from 'react-icons/md';
import { Layout } from 'src/components/layout';
import { Warning } from 'src/components/warning';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useNavigation } from '../hooks/navigation.hook';

export function SupportScreen(): JSX.Element {
  const { navigate } = useNavigation();
  const { translate, language } = useSettingsContext();
  const rootRef = useRef<HTMLDivElement>(null);

  const [showWarning, setShowWarning] = useState(false);

  function onCloseWarning(confirm: boolean) {
    setShowWarning(false);
    if (confirm) window.open('https://t.me/DFXswiss' + (language?.symbol === 'DE' ? '' : '_en'), '_blank');
  }

  const title = showWarning
    ? translate('screens/support', 'Telegram support')
    : translate('navigation/links', 'Support');

  return (
    <Layout title={title} rootRef={rootRef} onBack={showWarning ? () => setShowWarning(false) : undefined}>
      {showWarning ? (
        <Warning
          text={translate('screens/support', 'Please be cautious. We will never contact you first. Beware of scams.')}
          onClose={onCloseWarning}
        />
      ) : (
        <StyledVerticalStack gap={3} full className="text-left">
          <StyledButtonTile
            title={translate('screens/support', 'FAQ')}
            description={translate(
              'screens/support',
              'We have summarized the most common questions for you in our FAQ.',
            )}
            onClick={() =>
              window.open(`https://docs.dfx.swiss/${language?.symbol.toLowerCase() ?? 'en'}/faq.html`, '_blank')
            }
            buttonLabel={translate('screens/support', 'Search now')}
            icon={<IoMdHelpCircle className="h-auto w-7" />}
          />
          <StyledButtonTile
            title={translate('screens/support', 'Telegram Community')}
            description={translate(
              'screens/support',
              'Join the DFX Community. Our moderators are happy to assist you in the group.',
            )}
            onClick={() => setShowWarning(true)}
            buttonLabel={translate('screens/support', 'Join now')}
            icon={<FaTelegram className="h-auto w-6" />}
          />
          <StyledButtonTile
            title={translate('screens/support', 'Submit Ticket')}
            description={translate(
              'screens/support',
              'If you have a specific question or problem, you can submit a ticket here.',
            )}
            onClick={() => navigate('/support/issue')}
            buttonLabel={translate('screens/support', 'Submit Ticket')}
            icon={<MdEditSquare className="h-auto w-6" />}
          />
        </StyledVerticalStack>
      )}
    </Layout>
  );
}

function StyledButtonTile({
  title,
  description,
  onClick,
  buttonLabel,
  icon,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  buttonLabel: string;
  icon: JSX.Element;
}) {
  return (
    <div
      onClick={onClick}
      className="flex flex-1 flex-col gap-2 w-full p-4 border rounded-md text-dfxBlue-800 border-dfxGray-400 cursor-pointer hover:bg-link"
    >
      <div className="flex flex-row items-center gap-2 text-dfxBlue-800">
        {icon}
        <div className="text-base font-bold">{title}</div>
      </div>
      <p>{description}</p>
      <button className="flex h-full items-center flex-row gap-2 mt-1 text-dfxGray-800">
        <p>{buttonLabel}</p>
        <DfxIcon icon={IconVariant.ARROW_RIGHT} color={IconColor.RED} />
      </button>
    </div>
  );
}
