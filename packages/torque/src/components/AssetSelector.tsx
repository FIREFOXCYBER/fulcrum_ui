import React, { Component } from "react";
import { Asset } from "../domain/Asset";
import { WalletType } from "../domain/WalletType";
import { AssetSelectorItem } from "./AssetSelectorItem";

export interface IAssetSelectorProps {
  walletType: WalletType

  onSelectAsset?: (asset: Asset) => void;
}

export class AssetSelector extends Component<IAssetSelectorProps> {
  private readonly assetsAvailableForNonWeb3: Asset[] = [Asset.DAI, Asset.USDC];
  private readonly assetsAvailableForWeb3: Asset[] = [
    Asset.DAI,
    Asset.USDC,
    Asset.ETH,
    Asset.WBTC,
    Asset.LINK,
    Asset.ZRX,
    Asset.REP,
    Asset.KNC
  ];

  public render() {
    const assets =
      this.props.walletType === WalletType.Web3
        ? this.assetsAvailableForWeb3
        : this.props.walletType === WalletType.NonWeb3
        ? this.assetsAvailableForNonWeb3
        : [];

    const items = assets.map(e => {
      if (e === Asset.DAI ||
          e === Asset.USDC ||
          e === Asset.ETH) {
        return (
          <AssetSelectorItem key={e} asset={e} onSelectAsset={this.props.onSelectAsset} />
        );
      } else {
        return (
          <AssetSelectorItem key={e} asset={e} onSelectAsset={undefined} />
        );
      }
    });
    return <div className="asset-selector">{items}</div>;
  }
}
