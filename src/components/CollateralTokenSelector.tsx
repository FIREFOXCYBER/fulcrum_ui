import React, { Component } from "react";
import { Asset } from "../domain/Asset";
import { CollateralTokenSelectorItem } from "./CollateralTokenSelectorItem";

export interface ICollateralTokenSelectorProps {
  selectedCollateral: Asset;

  onCollateralChange: (asset: Asset) => void;
  onClose: () => void;
}

export class CollateralTokenSelector extends Component<ICollateralTokenSelectorProps> {
  private readonly assets: Asset[] = [
    Asset.wBTC,
    Asset.ETH,
    Asset.DAI,
    Asset.MKR,
    Asset.ZRX,
    Asset.BAT,
    Asset.REP,
    Asset.KNC
  ];

  public render() {
    const tokenItems = this.assets.map(e => (
      <CollateralTokenSelectorItem
        key={e}
        asset={e}
        selectedCollateral={this.props.selectedCollateral}
        onCollateralChange={this.props.onCollateralChange}
      />
    ));

    return (
      <div className="collateral-token-selector">
        <div className="collateral-token-selector__title">Select collateral token</div>
        <div className="collateral-token-selector__items">{tokenItems}</div>
        <div className="collateral-token-selector__actions">
          <div className="collateral-token-selector__action--close" onClick={this.props.onClose}>Close</div>
        </div>
      </div>
    );
  }
}
