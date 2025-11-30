import { ApiError, Utils, Validations } from '@dfx.swiss/react';
import {
  AlignContent,
  Form,
  IconVariant,
  SpinnerSize,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableExpandableRow,
  StyledDataTableRow,
  StyledInput,
  StyledLoadingSpinner,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorHint } from 'src/components/error-hint';
import {
  CreateRecommendation,
  Recommendation,
  RecommendationStatus,
  RecommendationType,
} from 'src/dto/recommendation.dto';
import { useKycLevelGuard, useUserGuard } from 'src/hooks/guard.hook';
import useRecommendation from 'src/hooks/recommendation.hook';
import { partition } from 'src/util/utils';
import { useSettingsContext } from '../contexts/settings.context';
import { useLayoutOptions } from '../hooks/layout-config.hook';

export default function RecommendationScreen(): JSX.Element {
  useUserGuard('/login');
  useKycLevelGuard(50);

  const { translate, translateError } = useSettingsContext();
  const { getRecommendations, createRecommendation, confirmRecommendation, rejectRecommendation } = useRecommendation();

  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>();
  const [processingId, setProcessingId] = useState<number>();
  const [isConfirming, setIsConfirming] = useState(false);

  const [pendingRequests, invitations] = useMemo(
    () =>
      partition(
        recommendations,
        (r) => r.type === RecommendationType.REQUEST && r.status === RecommendationStatus.PENDING,
      ),

    [recommendations],
  );

  useEffect(() => {
    loadRecommendations();
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid, errors },
  } = useForm<CreateRecommendation>({ mode: 'onTouched' });

  async function loadRecommendations(): Promise<void> {
    setIsLoading(true);
    setError(undefined);

    return getRecommendations()
      .then(setRecommendations)
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsLoading(false));
  }

  function onSubmit(data: CreateRecommendation) {
    setIsCreating(true);
    setError(undefined);

    createRecommendation(data)
      .then(() => {
        reset();
        setShowCreateForm(false);
        return loadRecommendations();
      })
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => setIsCreating(false));
  }

  function handleRecommendationAction(recommendation: Recommendation, confirm: boolean) {
    setError(undefined);
    setProcessingId(recommendation.id);
    setIsConfirming(confirm);

    const action = confirm ? confirmRecommendation : rejectRecommendation;

    action(recommendation)
      .then(() => loadRecommendations())
      .catch((error: ApiError) => setError(error.message ?? 'Unknown error'))
      .finally(() => {
        setProcessingId(undefined);
        setIsConfirming(false);
      });
  }

  const rules = Utils.createRules({
    recommendedAlias: Validations.Required,
    recommendedMail: [Validations.Required, Validations.Mail],
  });

  useLayoutOptions({
    title: translate('screens/recommendation', 'Recommendations'),
    backButton: true,
    onBack: showCreateForm
      ? () => {
          setShowCreateForm(false);
          setError(undefined);
          reset();
        }
      : undefined,
  });

  if (isLoading) {
    return <StyledLoadingSpinner size={SpinnerSize.LG} />;
  }

  return (
    <StyledVerticalStack gap={6} full>
      {showCreateForm ? (
        <>
          <Form
            control={control}
            rules={rules}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            translate={translateError}
          >
            <StyledVerticalStack gap={6} full center>
              <p className="text-dfxGray-700 font-semibold w-full text-start ml-3">
                {translate('screens/recommendation', 'Who would you like to invite?')}
              </p>

              <StyledInput
                name="recommendedAlias"
                label={translate('screens/kyc', 'Name')}
                placeholder={translate('screens/kyc', 'John Doe')}
                full
              />
              <StyledInput
                name="recommendedMail"
                label={translate('screens/kyc', 'Email')}
                placeholder={translate('screens/kyc', 'example@mail.com')}
                full
              />

              <StyledButton
                type="submit"
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.BLUE}
                label={translate('screens/recommendation', 'Create invitation')}
                onClick={handleSubmit(onSubmit)}
                disabled={!isValid}
                isLoading={isCreating}
              />
            </StyledVerticalStack>
          </Form>

          {error && <ErrorHint message={error} />}
        </>
      ) : error ? (
        <ErrorHint message={error} />
      ) : (
        <>
          {/* pending recommendation requests */}
          {pendingRequests.length > 0 && (
            <>
              <StyledVerticalStack gap={4} full>
                <h2 className="text-dfxGray-700">{translate('screens/recommendation', 'Pending Requests')}</h2>

                <StyledDataTable showBorder minWidth={false} alignContent={AlignContent.RIGHT}>
                  {pendingRequests.map((recommendation) => (
                    <StyledDataTableRow
                      key={recommendation.id}
                      label={`${recommendation.name} (${recommendation.mail})`}
                    >
                      <div className="flex justify-end gap-3">
                        <StyledButton
                          width={StyledButtonWidth.MIN}
                          color={StyledButtonColor.WHITE}
                          label={translate('general/actions', 'Confirm')}
                          onClick={() => handleRecommendationAction(recommendation, true)}
                          disabled={processingId === recommendation.id}
                          isLoading={processingId === recommendation.id && isConfirming}
                          deactivateMargin
                        />
                        <StyledButton
                          width={StyledButtonWidth.MIN}
                          color={StyledButtonColor.GRAY_OUTLINE}
                          label={translate('general/actions', 'Reject')}
                          onClick={() => handleRecommendationAction(recommendation, false)}
                          disabled={processingId === recommendation.id}
                          isLoading={processingId === recommendation.id && !isConfirming}
                          deactivateMargin
                        />
                      </div>
                    </StyledDataTableRow>
                  ))}
                </StyledDataTable>
              </StyledVerticalStack>

              <div className="border-t border-dfxGray-300 w-full mt-5" />
            </>
          )}

          {/* invitations */}
          <StyledVerticalStack gap={4} full center>
            <h2 className="text-dfxGray-700">{translate('screens/recommendation', 'Your Invitations')}</h2>
            {invitations.length > 0 ? (
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                {invitations.map((recommendation) => (
                  <StyledDataTableExpandableRow
                    key={recommendation.id}
                    label={recommendation.name ?? ''}
                    expansionItems={[
                      {
                        label: translate('screens/kyc', 'Email'),
                        text: recommendation.mail ?? '',
                      },
                      {
                        label: translate('screens/recommendation', 'Code'),
                        text: recommendation.code,
                        icon: IconVariant.COPY,
                        onClick: () => copy(recommendation.code),
                      },
                      {
                        label: translate('screens/payment', 'Expiry date'),
                        text: new Date(recommendation.expirationDate).toLocaleDateString(),
                      },
                    ]}
                  >
                    <p>{translate('screens/recommendation', recommendation.status)}</p>
                  </StyledDataTableExpandableRow>
                ))}
              </StyledDataTable>
            ) : (
              <p className="text-dfxGray-700">{translate('screens/recommendation', 'No invitations yet')}</p>
            )}

            <StyledButton
              width={StyledButtonWidth.FULL}
              color={StyledButtonColor.RED}
              label={translate('general/actions', 'Create')}
              onClick={() => setShowCreateForm(true)}
            />
          </StyledVerticalStack>
        </>
      )}
    </StyledVerticalStack>
  );
}
