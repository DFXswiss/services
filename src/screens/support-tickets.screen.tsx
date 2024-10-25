import { ApiError, SupportIssue, SupportIssueReason, SupportIssueState, useSupportChatContext } from '@dfx.swiss/react';
import {
  DfxIcon,
  IconColor,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { MdKeyboardArrowRight } from 'react-icons/md';
import { ErrorHint } from 'src/components/error-hint';
import { IssueReasonLabels, IssueTypeLabels } from 'src/config/labels';
import { useUserGuard } from 'src/hooks/guard.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { Layout } from '../components/layout';
import { useSettingsContext } from '../contexts/settings.context';

export default function SupportTicketsScreen(): JSX.Element {
  useUserGuard('/login');

  const { tickets, loadTickets } = useSupportChatContext();
  const { locale } = useSettingsContext();
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();

  const rootRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showCompletedTickets, setShowCompletedTickets] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setIsLoading(true);
    loadTickets()
      .catch((e: ApiError) => setError(e.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoading && !tickets?.length) navigate('/support/issue');
  }, [tickets, isLoading]);

  function sortCompletedLast(a: SupportIssue, b: SupportIssue) {
    return (a.state === SupportIssueState.COMPLETED ? 1 : 0) - (b.state === SupportIssueState.COMPLETED ? 1 : 0);
  }

  const sortedTickets = tickets ? [...tickets].sort(sortCompletedLast) : [];

  return (
    <Layout
      title={translate('screens/support', !sortedTickets.length ? 'Support' : 'Support tickets')}
      rootRef={rootRef}
    >
      <StyledVerticalStack center gap={4} full className="text-dfxBlue-800">
        {error ? (
          <div>
            <ErrorHint message={error} />
          </div>
        ) : !sortedTickets.length ? (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        ) : (
          <div className="flex flex-col w-full gap-4">
            <div className="flex rounded-md w-full overflow-clip border border-dfxGray-400">
              <table className="w-full text-sm text-left text-dfxGray-800">
                <thead className="text-xs text-dfxBlue-800 bg-dfxGray-400 leading-tight">
                  <tr>
                    <th scope="col" className="px-6 py-4 uppercase whitespace-normal">
                      {translate('screens/support', 'Issue type')}
                      <>
                        <br />
                        <span className="text-dfxGray-600 text-xs">{translate('screens/support', 'Reason')}</span>
                      </>
                    </th>
                    <th scope="col" className="px-6 py-4 uppercase">
                      {translate('screens/support', 'Created on')}
                      <>
                        <br />
                        <span className="text-dfxGray-600 text-xs">{translate('screens/payment', 'State')}</span>
                      </>
                    </th>
                    <th scope="col" className="px-3 py-4">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTickets.map((ticket) => (
                    <tr
                      key={ticket.uid}
                      onClick={() => navigate(`/support/chat/${ticket.uid}`)}
                      className={`bg-white border-b-4 border-dfxGray-300 last:border-none hover:bg-dfxGray-300/60 cursor-pointer ${
                        ticket.state === SupportIssueState.COMPLETED ? 'opacity-60' : ''
                      }`}
                      hidden={!showCompletedTickets && ticket.state === SupportIssueState.COMPLETED}
                    >
                      <th
                        scope="row"
                        className={`pl-6 py-4 font-medium whitespace-normal ${
                          ticket.state === SupportIssueState.COMPLETED ? 'text-dfxBlue-800/60' : 'text-dfxBlue-800'
                        } leading-tight`}
                      >
                        {translate('screens/support', IssueTypeLabels[ticket.type])}
                        {ticket.reason != SupportIssueReason.OTHER && (
                          <>
                            <br />
                            <span className="text-dfxGray-600 text-sm">
                              {translate('screens/support', IssueReasonLabels[ticket.reason])}
                            </span>
                          </>
                        )}
                      </th>
                      <td className="px-6 py-4 leading-tight whitespace-normal">
                        {new Date(ticket.created).toLocaleDateString(locale)}
                        <>
                          <br />
                          <span className="text-dfxGray-600 text-sm">{translate('screens/payment', ticket.state)}</span>
                        </>
                      </td>
                      <td align="right" className="pr-6 py-4 text-lg">
                        <MdKeyboardArrowRight />
                      </td>
                    </tr>
                  ))}
                  <tr
                    className="bg-white border-b-4 border-dfxGray-300 last:border-none hover:bg-dfxGray-300/60 cursor-pointer"
                    onClick={() => setShowCompletedTickets((prev) => !prev)}
                    hidden={!sortedTickets.some((ticket) => ticket.state === SupportIssueState.COMPLETED)}
                  >
                    <td className="px-6 py-3 text-xs" colSpan={2}>
                      <div className="flex flex-row items-center justify-between gap-2 ">
                        {showCompletedTickets
                          ? translate('screens/support', 'Hide completed tickets')
                          : translate('screens/support', 'Show completed tickets')}
                      </div>
                    </td>
                    <td align="right" className="pr-6 py-3 text-lg">
                      <DfxIcon
                        icon={showCompletedTickets ? IconVariant.EXPAND_LESS : IconVariant.EXPAND_MORE}
                        color={IconColor.DARK_GRAY}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <StyledButton
              label={translate('screens/support', 'Create Ticket')}
              onClick={() => navigate('/support/issue')}
              width={StyledButtonWidth.FULL}
            />
          </div>
        )}
      </StyledVerticalStack>
    </Layout>
  );
}
