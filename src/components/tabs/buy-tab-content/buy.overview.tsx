import { useAssetContext } from '../../../api/contexts/asset.context';
import { Asset } from '../../../api/definitions/asset';
import { useBlockchain } from '../../../hooks/blockchain.hook';
import StyledVerticalStack from '../../../stories/layout-helpers/StyledVerticalStack';
import StyledCoinList from '../../../stories/StyledCoinList';
import StyledCoinListItem from '../../../stories/StyledCoinListItem';

interface BuyTabContentOverviewProps {
  onAssetClicked: (asset: Asset) => void;
}

export function BuyTabContentOverview({ onAssetClicked }: BuyTabContentOverviewProps): JSX.Element {
  const { assets } = useAssetContext();
  const { toHeader, toProtocol } = useBlockchain();

  return (
    <StyledVerticalStack gap={0}>
      {Array.from(assets.entries()).map(([blockchain, assets], blockchainIndex) => (
        <StyledCoinList key={blockchainIndex} heading={toHeader(blockchain)}>
          {assets.map((asset, assetIndex) => (
            <StyledCoinListItem
              key={assetIndex}
              asset={asset}
              protocol={toProtocol(blockchain)}
              onClick={() => onAssetClicked(asset)}
            />
          ))}
        </StyledCoinList>
      ))}
    </StyledVerticalStack>
  );
}
