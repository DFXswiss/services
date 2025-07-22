import { Utils, Validations } from '@dfx.swiss/react';
import { Form, StyledButton, StyledDropdown, StyledVerticalStack } from '@dfx.swiss/react-components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLayoutContext } from '../contexts/layout.context';
import { useSettingsContext } from '../contexts/settings.context';
import { useLayoutOptions } from '../hooks/layout-config.hook';

interface TelegramQuizFormData {
  answer0: string;
  answer1: string;
  answer2: string;
}

const quiz: { id: string; question: string; answers: string[]; correct: string }[] = [
  {
    id: 'question0',
    question:
      'If someone offers you help in a private message, EVEN IF THEY APPEAR IDENTICAL TO A REAL GROUP ADMIN, should you ever respond to them?',
    answers: ['Yes', 'No'],
    correct: 'No',
  },
  {
    id: 'question1',
    question:
      'True or false: Scammers who want to steal your funds will message you pretending to be admins and official support accounts.',
    answers: ['True', 'False'],
    correct: 'True',
  },
  {
    id: 'question2',
    question:
      'Admins will NEVER give help by asking for your seed phrase or requiring you to follow any links. If anyone claims they need your seed phrase to help you with a problem, should you give it to them?',
    answers: ['Yes', 'No'],
    correct: 'No',
  },
];

export default function TelegramSupportScreen(): JSX.Element {
  const { language } = useSettingsContext();
  const { translate } = useSettingsContext();
  const { rootRef } = useLayoutContext();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<TelegramQuizFormData>({ mode: 'onChange' });

  const data = watch();

  const isCorrect =
    data.answer0 === quiz[0].correct && data.answer1 === quiz[1].correct && data.answer2 === quiz[2].correct;

  const rules = Utils.createRules({
    answer0: Validations.Required,
    answer1: Validations.Required,
    answer2: Validations.Required,
  });

  useLayoutOptions({ title: translate('screens/support', 'Telegram Support') });

  return (
    <Form control={control} rules={rules} errors={errors}>
      <StyledVerticalStack gap={4} full>
        <StyledVerticalStack gap={8} full className="text-left pt-4">
          {quiz.map((q, index) => (
            <StyledDropdown<string>
              key={q.id}
              rootRef={rootRef}
              name={`answer${index}`}
              label={translate('screens/support', q.question)}
              placeholder={translate('general/actions', 'Select') + '...'}
              items={q.answers}
              labelFunc={(item) => translate('general/actions', item)}
              full
            />
          ))}
        </StyledVerticalStack>

        <StyledButton
          onClick={() => {
            setIsRedirecting(true);
            window.location.href =
              language?.symbol.toLowerCase() === 'de'
                ? process.env.REACT_APP_TG_URL_DE ?? ''
                : process.env.REACT_APP_TG_URL_EN ?? '';
          }}
          label={translate('general/actions', 'Continue')}
          disabled={!isValid || !isCorrect || isRedirecting}
          isLoading={isRedirecting}
        />

        {isValid && !isCorrect && (
          <p className="text-dfxRed-100 text-center text-sm">
            {translate(
              'screens/support',
              'Please review your answers. Remember: Never trust private messages, scammers will impersonate admins, and NEVER share your seed phrase.',
            )}
          </p>
        )}
      </StyledVerticalStack>
    </Form>
  );
}
