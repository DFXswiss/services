import { TransactionFilter, TransactionFilterKey, useApi, useUserContext } from '@dfx.swiss/react';
import {
  AlignContent,
  IconVariant,
  StyledButton,
  StyledDataTable,
  StyledDataTableRow,
  StyledIconButton,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useAppParams } from 'src/hooks/app-params.hook';

export interface ApiKey {
  key: string;
  secret: string;
}

const UserUrl = 'user';
const toHistoryQuery = (types?: TransactionFilterKey[]) => (types ? '?' + Object.values(types).join('&') : '');

export default function CoinTracking({ onClose }: { onClose?: () => void }) {
  const { call } = useApi();
  const { user, reloadUser } = useUserContext();
  const { lang } = useAppParams();
  const { translate } = useSettingsContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [apiSecret, setApiSecret] = useState<string | undefined>(undefined);
  const [ctFilterEnabled, setCtFilterEnabled] = useState<boolean>(false);
  const [ctTypes, setCtTypes] = useState<TransactionFilterKey[]>();

  useEffect(() => {
    if (!user) return;
    setCtFilterEnabled(Boolean(user.activeAddress?.apiFilterCT?.length));
    setCtTypes(user.activeAddress?.apiFilterCT);
  }, [user]);

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
    generateApiKey(ctTypes)
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

  const enableCtFilter = (enabled: boolean) => {
    setCtFilterEnabled(enabled);
    updateFilter(enabled ? ctTypes : []);
  };

  const toggleCtFilter = (type: TransactionFilterKey) => {
    setCtTypes((t) => {
      const types = t ? t.filter((t) => t !== type) : [];
      updateFilter(types);
      return types;
    });
  };

  const updateFilter = (types?: TransactionFilterKey[]) => {
    putApiKeyFilter(types)
      .then(console.log)
      .then(() => console.log(translate('screens/payment', 'Saved')))
      .catch(() => console.error(translate('screens/payment', 'Error while saving.')));
  };

  return (
    <StyledVerticalStack gap={3} full className="text-dfxBlue-700">
      <h2>{translate('screens/payment', 'Cointracking Link (read rights)')}</h2>
      <StyledButton label={translate('screens/payment', 'Cointracking homepage')} onClick={onOpenCt} />
      {user?.activeAddress?.apiKeyCT == null ? (
        <StyledVerticalStack gap={3} full>
          <p>{translate('screens/payment', 'You can link your DFX account to your Cointracking account.')}</p>
          <StyledButton
            label={translate('screens/payment', 'Generate API key')}
            onClick={onGenerateKey}
            isLoading={isKeyLoading}
          />
        </StyledVerticalStack>
      ) : (
        <StyledVerticalStack gap={3} full>
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

      <h4>{translate('screens/payment', 'Current import filter')}</h4>

      {/* <View style={AppStyles.containerHorizontalWrap}>
        <RadioButton
          label={translate('screens/transactions', 'model.history.filter_inactive')}
          onPress={() => enableCtFilter(false)}
          checked={!ctFilterEnabled}
        />
        <RadioButton
          label={translate('screens/transactions', 'model.history.filter_active')}
          onPress={() => enableCtFilter(true)}
          checked={ctFilterEnabled}
        />
      </View>

      <View style={{ marginLeft: 30 }}>
        {Object.values(TransactionFilter).map((type) => (
          <Checkbox
            key={type}
            checked={ctTypes[type]}
            disabled={!ctFilterEnabled}
            label={translate('screens/transactions', `model.history.${type}`)}
            onPress={() => toggleCtFilter(type)}
          />
        ))}
      </View>

      <SpacerV height={20} />
      <Divider style={{ backgroundColor: Colors.LightGrey }} />
      <SpacerV height={20} />

      <H3 text={translate('screens/transactions', 'model.history.csv_export')} />
      {Object.values(TransactionFilter).map((type) => (
        <Checkbox
          key={type}
          checked={csvTypes[type]}
          label={translate('screens/transactions', `model.history.${type}`)}
          onPress={() => setCsvTypes((t) => ({ ...t, [type]: !t[type] }))}
        />
      ))}
      <SpacerV /> */}

      {/* <StyledButton
        label={translate('screens/transactions', 'action.next')}
        isLoading={isLoading}
        onClick={onExportHistory}
        disabled={Object.values(csvTypes).find((v) => v) == null}
      /> */}
    </StyledVerticalStack>
  );
}
