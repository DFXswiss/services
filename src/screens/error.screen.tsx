import { IconVariant, StyledButton, StyledButtonColor, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useEffect, useRef } from 'react';
import { useRouteError, useSearchParams } from 'react-router-dom';
import { useLayoutOptions } from 'src/hooks/layout-config.hook';
import { useNavigation } from 'src/hooks/navigation.hook';
import { isChunkLoadError, reloadOnceForChunkError, reportClientError } from 'src/util/client-error';
import { useSettingsContext } from '../contexts/settings.context';

export default function ErrorScreen(): JSX.Element {
  const { translate } = useSettingsContext();
  const { navigate } = useNavigation();
  const [params] = useSearchParams();
  const routeError = useRouteError();
  const hasReported = useRef(false);

  const error = params.get('msg');

  // This screen is the router's errorElement, so it is the only place where the error that broke
  // the render is still available. Report it before it is discarded — otherwise the failure exists
  // nowhere but in the customer's browser console.
  useEffect(() => {
    if (hasReported.current) return;
    hasReported.current = true;

    // Screens navigate here with an explicit message. That path has no route of its own, so the
    // router reports a 404 that says nothing about what actually went wrong — report the message.
    const reportedError = error ? Object.assign(new Error(error), { name: 'HandledError' }) : routeError;
    if (reportedError == null) return;

    reportClientError(reportedError, window.location.pathname);

    // A chunk left stale by a deploy recovers on its own once the app reloads. React hands the
    // failed import to this boundary, so this is where it can be caught — a window listener never
    // sees it.
    if (!error && isChunkLoadError(routeError)) reloadOnceForChunkError();
  }, [routeError, error]);

  useLayoutOptions({});

  return (
    <>
      <StyledVerticalStack center gap={5} marginY={5}>
        <div>
          <h2 className="text-dfxBlue-800">{translate('screens/error', 'Oh, sorry, something went wrong')}</h2>
          <p className="text-dfxGray-700">
            {error ??
              translate(
                'screens/error',
                'Please return to the previous page. If this problem persists, please contact our support.',
              )}
          </p>
        </div>

        <StyledButton
          icon={IconVariant.HELP}
          label={translate('navigation/links', 'Support')}
          color={StyledButtonColor.GRAY_OUTLINE}
          onClick={() => navigate('/support')}
        />
      </StyledVerticalStack>
    </>
  );
}
