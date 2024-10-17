import { ApiError, SupportIssue, useApi } from '@dfx.swiss/react';
import {
  SpinnerSize,
  StyledButton,
  StyledButtonWidth,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { MdKeyboardArrowRight } from 'react-icons/md';
import { ErrorHint } from 'src/components/error-hint';
import { IssueTypeLabels } from 'src/config/labels';
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

        setSupportTickets(tickets);
      })
      .catch((e: ApiError) => setError(e.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }, [call]);

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
              <thead className="text-xs text-dfxBlue-800 uppercase bg-dfxGray-400">
                <tr>
                  <th scope="col" className="px-6 py-4">
                    {translate('screens/support', 'Issue type')}
                  </th>
                  <th scope="col" className="px-6 py-4">
                    {translate('screens/payment', 'Created')}
                  </th>
                  <th scope="col" className="px-3 py-4">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {supportTickets.map((ticket) => (
                  <tr
                    key={ticket.uid}
                    onClick={() => navigate(`/support/chat/${ticket.uid}`)}
                    className="bg-white border-b-4 border-dfxGray-300 last:border-none hover:bg-dfxGray-300/50 cursor-pointer"
                  >
                    <th scope="row" className="px-6 py-4 font-medium text-dfxBlue-800 whitespace-nowrap">
                      {translate('screens/support', IssueTypeLabels[ticket.type])}
                    </th>
                    <td className="px-6 py-4">{new Date(ticket.created).toLocaleDateString()}</td>
                    <td className="px-3 py-4 text-right text-lg">
                      <MdKeyboardArrowRight />
                    </td>
                  </tr>
                ))}
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
