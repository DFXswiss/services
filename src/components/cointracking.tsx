import { TransactionFilter, TransactionFilterKey, useApi, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  Form,
  IconVariant,
  StyledButton,
  StyledButtonColor,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledDropdownMultiChoice,
  StyledIconButton,
  StyledSpacer,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from 'src/hooks/app-params.hook';

export interface ApiKey {
  key: string;
  secret: string;
}

interface FormData {
  selection?: { key: string; value: string };
  filter?: { key: string; label: string; value: string }[];
}

const UserUrl = 'user';
const toHistoryQuery = (types?: TransactionFilterKey[]) => (types ? '?' + Object.values(types).join('&') : '');
const equalKeys = (a: TransactionFilterKey[] | undefined, b: TransactionFilterKey[] | undefined) =>
  !(a || b) || (a && b && a.length === b.length && a.every((v, i) => v === b[i]));
// const exampleTypes = ['buy', 'sell', 'staking', 'ref', 'lm'] as TransactionFilterKey[];

export default function CoinTracking({ rootRef }: { rootRef: React.RefObject<HTMLDivElement> }) {
  const { call } = useApi();
  const { user, reloadUser } = useUserContext();
  const { lang } = useAppParams();
  const { translate } = useSettingsContext();
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [apiSecret, setApiSecret] = useState<string | undefined>(undefined);

  const getApiFilterCT = () => user?.activeAddress?.apiFilterCT;

  const filterOptions = [
    { key: 'All', value: 'Transfer all data' },
    { key: 'Filtered', value: 'Transfer filtered data' },
  ];

  const filterTypes = [
    { key: 'buy', label: 'Buy', value: translate('screens/payment', 'Buy transactions') },
    { key: 'sell', label: 'Sell', value: translate('screens/payment', 'Sell transactions') },
    { key: 'staking', label: 'Staking', value: translate('screens/payment', 'Staking transactions') },
    { key: 'ref', label: 'Referral', value: translate('screens/payment', 'Referral transactions') },
    { key: 'lm', label: 'LM', value: translate('screens/payment', 'Liquidity mining transactions') },
  ];

  const {
    control,
    formState: { errors },
    setValue,
  } = useForm<FormData>({ mode: 'onTouched' });

  const filterType = useWatch({ control, name: 'selection' });
  const filter = useWatch({ control, name: 'filter' });

  useEffect(() => {
    if (
      !equalKeys(
        getApiFilterCT(),
        filter?.map((f) => f.key as TransactionFilterKey),
      )
    ) {
      if (getApiFilterCT()?.length) {
        setValue('selection', filterOptions[1]);
        setValue(
          'filter',
          filterTypes.filter((t) => getApiFilterCT()?.includes(t.key as TransactionFilterKey)),
        );
      } else {
        setValue('selection', filterOptions[0]);
      }
    }
  }, [user?.activeAddress?.apiFilterCT]);

  useEffect(() => {
    const f = filter?.map((f) => f.key as TransactionFilterKey);
    if (filterType?.key === 'Filtered' && !equalKeys(getApiFilterCT(), f)) {
      updateFilter(f);
    } else if (filterType?.key === 'All' && getApiFilterCT()?.length) {
      updateFilter();
    }
  }, [filterType, filter]);

  const onOpenCt = () => {
    let url = 'https://cointracking.info/?ref=D270827';
    url += lang ? `&language=${lang.toLowerCase()}` : '';
    window.open(url, '_blank');
  };

  const generateApiKey = (types?: TransactionFilterKey[]): Promise<ApiKey> => {
    return call<ApiKey>({ url: `${UserUrl}/apiKey/CT${toHistoryQuery(types)}`, method: 'POST' });
  };

  const deleteApiKey = (): Promise<void> => {
    return call<void>({ url: `${UserUrl}/apiKey/CT`, method: 'DELETE' });
  };

  const putApiKeyFilter = (types?: TransactionFilterKey[]): Promise<TransactionFilter[]> => {
    return call<TransactionFilter[]>({ url: `${UserUrl}/apiFilter/CT${toHistoryQuery(types)}`, method: 'PUT' });
  };

  const onGenerateKey = () => {
    setIsKeyLoading(true);
    generateApiKey(getApiFilterCT())
      .then((keys) => {
        reloadUser();
        setApiSecret(keys.secret);
      })
      .catch(() => console.error(translate('screens/payment', 'Error loading the data.')))
      .finally(() => setIsKeyLoading(false));
  };

  const onDeleteKey = () => {
    setIsKeyLoading(true);
    deleteApiKey()
      .then(() => reloadUser())
      .catch(() => console.error(translate('screens/payment', 'Error while deleting.')))
      .finally(() => setIsKeyLoading(false));
  };

  const updateFilter = (types?: TransactionFilterKey[]) => {
    putApiKeyFilter(types)
      .then(() => reloadUser())
      .then(() => console.log(translate('screens/payment', 'Saved')))
      .catch(() => console.error(translate('screens/payment', 'Error while saving.')));
  };

  return (
    <StyledVerticalStack gap={4} full className="text-dfxBlue-700">
      <p>{translate('screens/payment', 'You can link your DFX account to your Cointracking account.')}</p>
      <StyledButton
        label={translate('screens/payment', 'Cointracking homepage')}
        onClick={onOpenCt}
        color={StyledButtonColor.STURDY_WHITE}
      />
      {user?.activeAddress?.apiKeyCT == null ? (
        <StyledVerticalStack gap={3} full>
          <StyledButton
            label={translate('screens/payment', 'Generate API key')}
            onClick={onGenerateKey}
            isLoading={isKeyLoading}
          />
        </StyledVerticalStack>
      ) : (
        <StyledVerticalStack gap={4} full>
          <StyledDataTable alignContent={AlignContent.RIGHT} minWidth={false}>
            <StyledDataTableRow label={translate('screens/payment', 'API key')}>
              <div className="flex flex-row gap-2">
                <p>{user?.activeAddress?.apiKeyCT}</p>
                <StyledIconButton icon={IconVariant.COPY} onClick={() => copy(user?.activeAddress?.apiKeyCT ?? '')} />
              </div>
            </StyledDataTableRow>
            {apiSecret && (
              <StyledDataTableRow label={translate('screens/payment', 'API secret')}>
                <p>{apiSecret}</p>
                <StyledIconButton icon={IconVariant.COPY} onClick={() => copy(apiSecret)} />
              </StyledDataTableRow>
            )}
          </StyledDataTable>

          <StyledButton
            label={translate('screens/payment', 'Delete API key')}
            onClick={onDeleteKey}
            isLoading={isKeyLoading}
          />
        </StyledVerticalStack>
      )}
      <StyledSpacer spacing={0} />

      <Form control={control} errors={errors}>
        <StyledVerticalStack gap={4} full>
          <StyledDropdown
            label={translate('screens/payment', 'Import filter')}
            name="selection"
            rootRef={rootRef}
            placeholder={translate('general/actions', 'Select...')}
            items={filterOptions}
            labelFunc={(item) => item.key}
            descriptionFunc={(item) => item.value}
          />
          {filterType?.key === 'Filtered' && (
            <StyledDropdownMultiChoice
              name="filter"
              rootRef={rootRef}
              placeholder={translate('general/actions', 'Select data to import...')}
              items={filterTypes}
              labelFunc={(item) => item.label}
              descriptionFunc={(item) => item.value}
            />
          )}
        </StyledVerticalStack>
      </Form>
    </StyledVerticalStack>
  );
}
