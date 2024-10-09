import { Blockchain, Utils, Validations } from '@dfx.swiss/react';
import {
  Form,
  StyledButton,
  StyledButtonWidth,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWeb3 } from 'src/hooks/web3.hook';
import { readFileAsText } from 'src/util/utils';
import { Layout } from '../components/layout';

const availableBlockchains = [
  Blockchain.ETHEREUM,
  Blockchain.POLYGON,
  Blockchain.ARBITRUM,
  Blockchain.OPTIMISM,
  Blockchain.BASE,
];

const availableSigners = ['0x9229e0179a436CD0b77F731992307AC765Bc4b17'];

interface FormData {
  blockchain: Blockchain;
  contractAddress: string;
  file: File;
  signer: string;
  privateKey: string;
}

export default function BlockchainTransactionScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { toChainId } = useWeb3();
  const rootRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const {
    watch,
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'all',
    defaultValues: {
      blockchain: Blockchain.ETHEREUM,
      signer: availableSigners[0],
    },
  });

  const data = watch();
  const selectedFile = useWatch({ control, name: 'file' });
  const selectedPrivateKey = useWatch({ control, name: 'privateKey' });

  async function onSubmit(data: FormData) {
    const { blockchain, contractAddress, signer, privateKey, file } = data;
    setIsLoading(true);
    // TODO: implement transaction signing and send it to the blockchain
    setIsLoading(false);
  }

  const rules = Utils.createRules({
    blockchain: Validations.Required,
    contractAddress: Validations.Required,
    signer: Validations.Required,
    file: [
      Validations.Required,
      Validations.Custom((file) => (file?.type === 'application/json' ? true : 'json_file')),
    ],
  });

  return (
    <Layout title={translate('screens/support', 'Transaction signing')} rootRef={rootRef}>
      <Form
        control={control}
        rules={rules}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        translate={translateError}
      >
        <StyledVerticalStack full gap={6}>
          <StyledDropdown<Blockchain>
            name="blockchain"
            rootRef={rootRef}
            label={translate('screens/settings', 'Blockchain')}
            smallLabel={true}
            placeholder={translate('general/actions', 'Select...')}
            items={availableBlockchains}
            labelFunc={(item) => item}
            descriptionFunc={(item) => `Chain ID - ${toChainId(item)?.toString()}`}
          />
          <StyledInput
            name="contractAddress"
            autocomplete="contractAddress"
            label={translate('screens/payment', 'Contract address')}
            placeholder={translate('screens/kyc', 'John Doe')}
            full
            smallLabel
          />
          <div className="flex flex-col gap-2">
            <StyledFileUpload
              name="file"
              label={translate('screens/support', 'Transaction (input data)')}
              placeholder={translate('general/actions', 'Drop JSON file here')}
              buttonLabel={translate('general/actions', 'Browse')}
              full
              smallLabel
            />
            {selectedFile && !errors.file && (
              <JsonDisplay
                file={selectedFile}
                label={translate('screens/support', 'Transaction (input data)')}
                hideLabel
              />
            )}
          </div>
          <StyledDropdown<string>
            name="signer"
            rootRef={rootRef}
            label={translate('screens/settings', 'Signer')}
            smallLabel={true}
            placeholder={translate('general/actions', 'Select...')}
            items={availableSigners}
            labelFunc={(item) => item}
          />
          <StyledInput
            type={showPrivateKey ? 'text' : 'password'}
            name="privateKey"
            autocomplete="current-password"
            buttonLabel={selectedPrivateKey ? translate('general/actions', 'Show') : undefined}
            buttonClick={() => setShowPrivateKey(!showPrivateKey)}
            label={translate('screens/payment', 'Private key')}
            placeholder={translate('screens/kyc', 'John Doe')}
            full
            smallLabel
          />
          <StyledButton
            type="submit"
            label={translate('general/actions', 'Sign transaction')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isLoading}
          />
        </StyledVerticalStack>
      </Form>
    </Layout>
  );
}

interface JsonDisplayProps {
  file: File;
  label: string;
  smallLabel?: boolean;
  hideLabel?: boolean;
}

function JsonDisplay({ file, label, smallLabel = false, hideLabel = false }: JsonDisplayProps): JSX.Element {
  const [json, setJson] = useState<string | undefined>();

  useEffect(() => {
    readFileAsText(file, setJson);
  }, [file]);

  return (
    <StyledVerticalStack gap={1} full>
      <label
        hidden={hideLabel}
        className={`text-start ${smallLabel ? 'text-sm' : 'text-base'} font-semibold pl-3 text-dfxBlue-800`}
      >
        {label}
      </label>
      <div className="border rounded-md p-4 border-dfxGray-500 overflow-x-auto">
        <pre className="text-left text-dfxGray-700 text-sm">{json}</pre>
      </div>
    </StyledVerticalStack>
  );
}
