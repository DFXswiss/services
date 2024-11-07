import { Blockchain, useApi, Utils, Validations } from '@dfx.swiss/react';
import {
  AlignContent,
  CopyButton,
  Form,
  StyledButton,
  StyledButtonColor,
  StyledButtonWidth,
  StyledDataTable,
  StyledDataTableRow,
  StyledDropdown,
  StyledFileUpload,
  StyledInput,
  StyledVerticalStack,
} from '@dfx.swiss/react-components';
import copy from 'copy-to-clipboard';
import { ethers } from 'ethers';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSettingsContext } from 'src/contexts/settings.context';
import { useWindowContext } from 'src/contexts/window.context';
import { useAdminGuard } from 'src/hooks/guard.hook';
import { useWeb3 } from 'src/hooks/web3.hook';
import { blankedAddress, readFileAsText } from 'src/util/utils';
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
  signer: string;
  file: File;
}

export default function BlockchainTransactionScreen(): JSX.Element {
  const { translate, translateError } = useSettingsContext();
  const { toChainObject, toChainId } = useWeb3();
  const { width } = useWindowContext();
  const { call } = useApi();
  const rootRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [txExplorerUrl, setTxExplorerUrl] = useState<string>();

  useAdminGuard();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'all',
    defaultValues: {
      blockchain: Blockchain.POLYGON,
      signer: availableSigners[0],
    },
  });

  const selectedFile = useWatch({ control, name: 'file' });

  async function onSubmit(data: FormData) {
    setError(undefined);
    setTxExplorerUrl(undefined);
    setIsLoading(true);

    const chainObject = toChainObject(data.blockchain);
    if (!chainObject) {
      setError('Invalid blockchain');
      setIsLoading(false);
      return;
    }

    try {
      const { blockchain, contractAddress, signer, file } = data;

      const txResponse = await call<ethers.providers.TransactionResponse>({
        url: `gs/evm/contractTransaction`,
        method: 'POST',
        data: { blockchain, contractAddress, signer, callData: await readFileAsText(file) },
      });

      const provider = new ethers.providers.JsonRpcProvider(chainObject.rpcUrls[0]);
      const receipt = await provider.waitForTransaction(txResponse.hash);

      setTxExplorerUrl(chainObject?.blockExplorerUrls[0] + `tx/${receipt.transactionHash}`);
    } catch (error: any) {
      setError(error.message ?? 'Error signing or sending the transaction');
    } finally {
      setIsLoading(false);
    }
  }

  const rules = Utils.createRules({
    blockchain: Validations.Required,
    contractAddress: Validations.Required,
    file: [
      Validations.Required,
      Validations.Custom((file) => (file?.type === 'application/json' ? true : 'json_file')),
    ],
    signer: Validations.Required,
  });

  return (
    <Layout title={translate('screens/blockchain', 'Transaction signing')} rootRef={rootRef}>
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
            label={translate('screens/home', 'Blockchain')}
            smallLabel={true}
            placeholder={translate('general/actions', 'Select') + '...'}
            items={availableBlockchains}
            labelFunc={(item) => item}
            descriptionFunc={(item) => `Chain ID - ${toChainId(item)?.toString()}`}
          />
          <StyledInput
            name="contractAddress"
            autocomplete="contractAddress"
            label={translate('screens/blockchain', 'Contract address')}
            placeholder={translate('screens/kyc', 'John Doe')}
            full
            smallLabel
          />
          <div className="flex flex-col gap-2">
            <StyledFileUpload
              name="file"
              label={translate('screens/blockchain', 'Transaction (Input data)')}
              placeholder={translate('general/actions', 'Drop JSON file here')}
              buttonLabel={translate('general/actions', 'Browse')}
              full
              smallLabel
            />
            {selectedFile && !errors.file && (
              <JsonDisplay
                file={selectedFile}
                label={translate('screens/blockchain', 'Transaction (Input data)')}
                hideLabel
              />
            )}
          </div>
          <StyledDropdown<string>
            name="signer"
            rootRef={rootRef}
            label={translate('screens/blockchain', 'Signer')}
            smallLabel={true}
            placeholder={translate('general/actions', 'Select') + '...'}
            items={availableSigners}
            labelFunc={(item) => blankedAddress(item, { width, scale: 1.2 })}
          />

          {error && <div className="text-dfxRed-100 text-sm">{error}</div>}

          <StyledButton
            type="submit"
            label={translate('screens/blockchain', 'Sign transaction')}
            onClick={handleSubmit(onSubmit)}
            width={StyledButtonWidth.FULL}
            disabled={!isValid}
            isLoading={isLoading}
          />

          {txExplorerUrl && (
            <StyledVerticalStack center full gap={4} className="border border-dfxGray-500 rounded-md p-4 ">
              <StyledDataTable alignContent={AlignContent.RIGHT} showBorder minWidth={false}>
                <StyledDataTableRow label={translate('screens/blockchain', 'Transaction hash')}>
                  <p className="font-semibold">
                    {blankedAddress(txExplorerUrl?.split('/').pop() ?? '', { width, scale: 0.7 })}
                  </p>
                  <CopyButton onCopy={() => copy(txExplorerUrl?.split('/').pop() ?? '')} />
                </StyledDataTableRow>
              </StyledDataTable>
              <StyledButton
                type="button"
                label={translate('general/actions', 'Open Explorer')}
                onClick={() => window.open(txExplorerUrl ?? '', '_blank')}
                width={StyledButtonWidth.FULL}
                color={StyledButtonColor.STURDY_WHITE}
              />
            </StyledVerticalStack>
          )}
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
    readFileAsText(file).then(setJson);
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
