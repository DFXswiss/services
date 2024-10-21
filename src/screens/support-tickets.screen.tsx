import { ApiError, SupportIssue, SupportIssueReason, SupportIssueState, useApi } from '@dfx.swiss/react';
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

  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const { call } = useApi();

  const rootRef = useRef<HTMLDivElement>(null);

  const [supportTickets, setSupportTickets] = useState<SupportIssue[]>([]);
  const [showCompletedTickets, setShowCompletedTickets] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setIsLoading(true);
    call<SupportIssue[]>({ method: 'GET', url: 'support/issue' })
      .then((tickets) => {
        if (tickets.length === 0) {
          // TODO: Ths redirect should skip the entire page
          navigate('/support/issue');
          return;
        }

        setSupportTickets(tickets.sort(sortCompletedLast));
      })
      .catch((e: ApiError) => setError(e.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [call]);

  function sortCompletedLast(a: SupportIssue, b: SupportIssue) {
    return (a.state === SupportIssueState.COMPLETED ? 1 : 0) - (b.state === SupportIssueState.COMPLETED ? 1 : 0);
  }

  return (
    <Layout title={translate('screens/support', 'Support tickets')} rootRef={rootRef}>
      <StyledVerticalStack center gap={4} full className="text-dfxBlue-800">
        {error ? (
          <div>
            <ErrorHint message={error} />
          </div>
        ) : isLoading ? (
          <StyledLoadingSpinner size={SpinnerSize.LG} />
        ) : (
          <div className="flex rounded-md w-full overflow-clip border border-dfxGray-400">
            <table className="w-full text-sm text-left text-dfxGray-800">
              <thead className="text-xs text-dfxBlue-800 bg-dfxGray-400 leading-tight">
                <tr>
                  <th scope="col" className="px-6 py-4 uppercase">
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
                {supportTickets
                  .filter((ticket) => showCompletedTickets || ticket.state !== SupportIssueState.COMPLETED)
                  .map((ticket) => (
                    <tr
                      key={ticket.uid}
                      onClick={() => navigate(`/support/chat/${ticket.uid}`)}
                      className={`bg-white border-b-4 border-dfxGray-300 last:border-none hover:bg-dfxGray-300/60 cursor-pointer ${
                        ticket.state === SupportIssueState.COMPLETED ? 'opacity-60' : ''
                      }`}
                    >
                      <th
                        scope="row"
                        className={`pl-6 py-4 font-medium ${
                          ticket.state === SupportIssueState.COMPLETED ? 'text-dfxBlue-800/60' : 'text-dfxBlue-800'
                        }  whitespace-nowrap leading-tight`}
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
                      <td className="px-6 py-4 leading-tight">
                        {new Date(ticket.created).toLocaleDateString()}
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
                  hidden={supportTickets.length === 0}
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
        )}
        <StyledButton
          label={translate('screens/support', 'Create Ticket')}
          onClick={() => navigate('/support/issue')}
          width={StyledButtonWidth.FULL}
        />
      </StyledVerticalStack>
    </Layout>
  );
}
