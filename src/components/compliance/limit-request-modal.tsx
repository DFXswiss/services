import { ApiError, FundOrigin, InvestmentDate, Limit, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import { Modal } from 'src/components/modal';
import { LimitRequestFields } from 'src/components/support-issue/limit-request-fields';
import { DefaultFileTypes } from 'src/config/file-types';
import { useLayoutContext } from 'src/contexts/layout.context';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useCallQueueClerks } from 'src/hooks/call-queue-clerks.hook';
import { useCompliance } from 'src/hooks/compliance.hook';
import { toBase64 } from 'src/util/utils';

interface LimitRequestModalProps {
  isOpen: boolean;
  userDataId: number;
  defaultName?: string;
  onClose: () => void;
  onCreated?: () => void;
}

interface LimitRequestFormData {
  name: string;
  limit: Limit;
  investmentDate: InvestmentDate;
  fundOrigin: FundOrigin;
  message: string;
  file?: File;
}

export function LimitRequestModal({
  isOpen,
  userDataId,
  defaultName,
  onClose,
  onCreated,
}: LimitRequestModalProps): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { rootRef } = useLayoutContext();
  const { createLimitRequest } = useCompliance();
  const { clerks } = useCallQueueClerks();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [author, setAuthor] = useState<string>('');

  useEffect(() => {
    setAuthor((prev) => prev || clerks[0] || '');
  }, [clerks]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<LimitRequestFormData>({
    mode: 'all',
    defaultValues: { name: defaultName },
  });
  const investmentDate = useWatch({ control, name: 'investmentDate' });

  const rules = Utils.createRules({
    name: Validations.Required,
    limit: Validations.Required,
    investmentDate: Validations.Required,
    fundOrigin: Validations.Required,
    message: [Validations.Required, Validations.Custom((message) => message.length <= 4000 || 'message_length')],
    file: [Validations.Custom((file) => (!file || DefaultFileTypes.includes(file.type) ? true : 'file_type'))],
  });

  function handleClose(): void {
    reset({ name: defaultName });
    setError(undefined);
    onClose();
  }

  async function onSubmit(data: LimitRequestFormData): Promise<void> {
    setIsLoading(true);
    setError(undefined);

    if (!author) {
      setError('Signature is required');
      setIsLoading(false);
      return;
    }

    try {
      await createLimitRequest(userDataId, {
        author,
        name: data.name,
        message: data.message,
        limit: data.limit,
        investmentDate: data.investmentDate,
        fundOrigin: data.fundOrigin,
        file: data.file && (await toBase64(data.file)),
        fileName: data.file?.name,
      });
      onCreated?.();
      handleClose();
    } catch (e) {
      setError((e as ApiError).message ?? 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-dfxBlue-800 mb-4 text-left">
          {translate('screens/support', 'Limit increase request')}
        </h2>

        <Form
          control={control}
          rules={rules}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          translate={translateError}
        >
          <StyledVerticalStack gap={6} full center>
            <LimitRequestFields
              rootRef={rootRef}
              control={control}
              rules={rules}
              errors={errors}
              investmentDate={investmentDate}
            />

            {error && (
              <div>
                <ErrorHint message={error} />
              </div>
            )}

            <div className="w-full text-left">
              <label className="block text-sm font-medium text-dfxBlue-800 mb-1">Signature</label>
              <select
                className="w-full px-3 py-2 text-sm bg-white border border-dfxGray-300 rounded text-dfxBlue-800"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              >
                <option value="">—</option>
                {clerks.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 w-full">
              <StyledButton
                label={translate('general/actions', 'Cancel')}
                onClick={handleClose}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
                disabled={isLoading}
              />
              <StyledButton
                type="submit"
                label={translate('general/actions', 'Save')}
                onClick={handleSubmit(onSubmit)}
                width={StyledButtonWidth.FULL}
                disabled={!isValid || !author}
                isLoading={isLoading}
              />
            </div>
          </StyledVerticalStack>
        </Form>
      </div>
    </Modal>
  );
}
