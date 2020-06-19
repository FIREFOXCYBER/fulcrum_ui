import { BigNumber } from "@0x/utils";
import React, { Component } from "react";
import { Asset } from "../domain/Asset";
import { ManageCollateralRequest } from "../domain/ManageCollateralRequest";
import { PositionType } from "../domain/PositionType";
import { TradeRequest } from "../domain/TradeRequest";
import { TradeType } from "../domain/TradeType";
import { FulcrumProviderEvents } from "../services/events/FulcrumProviderEvents";
import { ProviderChangedEvent } from "../services/events/ProviderChangedEvent";
import { FulcrumProvider } from "../services/FulcrumProvider";
import { Preloader } from "./Preloader";
import { ReactComponent as OpenManageCollateral } from "../assets/images/openManageCollateral.svg";
import { IBorrowedFundsState } from "../domain/IBorrowedFundsState";
import { RequestStatus } from "../domain/RequestStatus";
import { RequestTask } from "../domain/RequestTask";
import { CircleLoader } from "./CircleLoader";
import { TradeTxLoaderStep } from "./TradeTxLoaderStep";

export interface IOwnTokenGridRowProps {
  loan: IBorrowedFundsState;
  tradeAsset: Asset;
  collateralAsset: Asset;
  leverage: number;
  positionType: PositionType;
  positionValue: BigNumber;
  value: BigNumber;
  collateral: BigNumber;
  openPrice: BigNumber;
  liquidationPrice: BigNumber;
  profit: BigNumber;
  isTxCompleted: boolean;
  onTrade: (request: TradeRequest) => void;
  onManageCollateralOpen: (request: ManageCollateralRequest) => void;
  changeLoadingTransaction: (isLoadingTransaction: boolean, request: TradeRequest | undefined, isTxCompleted: boolean, resultTx: boolean) => void;
}

interface IOwnTokenGridRowState {
  isLoading: boolean;
  isLoadingTransaction: boolean;
  request: TradeRequest | undefined;
  resultTx: boolean;
}

export class OwnTokenGridRow extends Component<IOwnTokenGridRowProps, IOwnTokenGridRowState> {
  constructor(props: IOwnTokenGridRowProps, context?: any) {
    super(props, context);

    this._isMounted = false;

    this.state = {
      isLoading: true,
      isLoadingTransaction: false,
      request: undefined,
      resultTx: false
    };

    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.ProviderAvailable, this.onProviderAvailable);
    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.ProviderChanged, this.onProviderChanged);
    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.AskToOpenProgressDlg, this.onAskToOpenProgressDlg);
    FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.AskToCloseProgressDlg, this.onAskToCloseProgressDlg);
    // FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.TradeTransactionMined, this.onTradeTransactionMined);
  }

  private _isMounted: boolean;

  private async derivedUpdate() {
    this._isMounted && this.setState({
      isLoading: true
    });
    const collateralToPrincipalRate = await FulcrumProvider.Instance.getSwapRate(this.props.loan.collateralAsset, this.props.loan.loanAsset);
    let positionValue = new BigNumber(0);
    let value = new BigNumber(0);
    let collateral = new BigNumber(0);
    let openPrice = new BigNumber(0);
    //liquidation_collateralToLoanRate = ((15000000000000000000 * principal / 10^20) + principal) / collateral * 10^18
    //If SHORT -> 10^36 / liquidation_collateralToLoanRate
    const liquidation_collateralToLoanRate = (new BigNumber("15000000000000000000").times(this.props.loan.loanData!.principal).div(10 ** 20)).plus(this.props.loan.loanData!.principal).div(this.props.loan.loanData!.collateral).times(10 ** 18);
    let liquidationPrice = new BigNumber(0);
    let profit = new BigNumber(0);
    if (this.props.positionType === PositionType.LONG) {
      positionValue = this.props.loan.loanData!.collateral.div(10 ** 18);
      value = this.props.loan.loanData!.collateral.div(10 ** 18).times(collateralToPrincipalRate);
      collateral = ((this.props.loan.loanData!.collateral.times(collateralToPrincipalRate).div(10 ** 18)).minus(this.props.loan.loanData!.principal.div(10 ** 18)));
      openPrice = this.props.loan.loanData!.startRate.div(10 ** 18);
      liquidationPrice = liquidation_collateralToLoanRate.div(10 ** 18);

      const startingValue = ((this.props.loan.loanData!.collateral.times(openPrice.times(10 ** 18)).div(10 ** 18)).minus(this.props.loan.loanData!.principal)).div(10 ** 18);
      const currentValue = ((this.props.loan.loanData!.collateral.times(collateralToPrincipalRate.times(10 ** 18)).div(10 ** 18)).minus(this.props.loan.loanData!.principal)).div(10 ** 18);
      profit = currentValue.minus(startingValue);
    }
    else {
      positionValue = this.props.loan.loanData!.principal.div(10 ** 18);
      value = this.props.loan.loanData!.collateral.div(10 ** 18);
      collateral = ((this.props.loan.loanData!.collateral.div(10 ** 18)).minus(this.props.loan.loanData!.principal.div(collateralToPrincipalRate).div(10 ** 18)));
      openPrice = new BigNumber(10 ** 36).div(this.props.loan.loanData!.startRate).div(10 ** 18);
      liquidationPrice = new BigNumber(10 ** 36).div(liquidation_collateralToLoanRate).div(10 ** 18);
      const startingValue = (this.props.loan.loanData!.collateral.minus(this.props.loan.loanData!.principal.div(openPrice.times(10 ** 18)).times(10 ** 18))).div(10 ** 18);
      const currentValue = (this.props.loan.loanData!.collateral.minus(this.props.loan.loanData!.principal.div(collateralToPrincipalRate.times(10 ** 18)).times(10 ** 18))).div(10 ** 18);
      profit = startingValue.minus(currentValue);
    }
    this._isMounted && this.setState({
      ...this.state,
      isLoading: false,
    });
  }

  private onProviderAvailable = async () => {
    await this.derivedUpdate();
  };

  private onProviderChanged = async () => {
    await this.derivedUpdate();
  };

  private onAskToOpenProgressDlg = (taskId: string) => {
    if (!this.state.request || taskId !== this.state.request.loanId) return;
    this.setState({ ...this.state, isLoadingTransaction: true, resultTx: true })
    this.props.changeLoadingTransaction(this.state.isLoadingTransaction, this.state.request, false, this.state.resultTx);
  }
  private onAskToCloseProgressDlg = (task: RequestTask) => {
    if (!this.state.request || task.request.loanId !== this.state.request.loanId) return;
    if (task.status === RequestStatus.FAILED || task.status === RequestStatus.FAILED_SKIPGAS) {
      window.setTimeout(() => {
        FulcrumProvider.Instance.onTaskCancel(task);
        this.setState({ ...this.state, isLoadingTransaction: false, request: undefined, resultTx: false });
        this.props.changeLoadingTransaction(this.state.isLoadingTransaction, this.state.request, true, this.state.resultTx);
      }, 5000)
      return;
    }
    this.setState({ ...this.state, isLoadingTransaction: false, request: undefined, resultTx: true });
    this.props.changeLoadingTransaction(this.state.isLoadingTransaction, this.state.request, true, this.state.resultTx);
  }

  // private onTradeTransactionMined = async (event: TradeTransactionMinedEvent) => {
  //   if (event.key.toString() === this.props.currentKey.toString()) {
  //     await this.derivedUpdate();
  //   }
  // };

  public componentWillUnmount(): void {
    this._isMounted = false;

    FulcrumProvider.Instance.eventEmitter.off(FulcrumProviderEvents.ProviderAvailable, this.onProviderAvailable);
    FulcrumProvider.Instance.eventEmitter.off(FulcrumProviderEvents.ProviderChanged, this.onProviderChanged);
    FulcrumProvider.Instance.eventEmitter.off(FulcrumProviderEvents.AskToOpenProgressDlg, this.onAskToOpenProgressDlg);
    FulcrumProvider.Instance.eventEmitter.off(FulcrumProviderEvents.AskToCloseProgressDlg, this.onAskToCloseProgressDlg);
    // FulcrumProvider.Instance.eventEmitter.off(FulcrumProviderEvents.TradeTransactionMined, this.onTradeTransactionMined);
  }
  public componentWillMount(): void {
    this.derivedUpdate();
  }

  public componentDidMount(): void {
    this._isMounted = true;

    this.derivedUpdate();
  }

  public render() {
    return (this.state.isLoadingTransaction && this.state.request
      ? <React.Fragment>
        <div className="token-selector-item__image">
          <CircleLoader></CircleLoader>
          <TradeTxLoaderStep taskId={this.state.request.loanId} />
        </div>
      </React.Fragment>
        : <div className={`own-token-grid-row ${this.props.isTxCompleted ? `completed` : ``}`}>
          <div className="own-token-grid-row__col-token-name  opacityIn">
            {`${this.props.tradeAsset.toUpperCase()}`}
          </div>
          <div className="own-token-grid-row__col-position-type opacityIn">
            <span className="position-type-marker">
              {`${this.props.leverage}x ${this.props.positionType}`}
            </span>
          </div>
          <div title={this.props.collateralAsset} className="own-token-grid-row__col-asset-unit opacityIn">
            {this.props.collateralAsset}
          </div>
          <div title={this.props.positionValue.toFixed(18)} className="own-token-grid-row__col-position  opacityIn">
            {this.props.positionValue.toFixed(4)}
          </div>
          <div title={this.props.openPrice.toFixed(18)} className="own-token-grid-row__col-asset-price  opacityIn">
            {!this.state.isLoading
              ? <React.Fragment>
                <span className="sign-currency">$</span>{this.props.openPrice.toFixed(2)}
              </React.Fragment>
              : <Preloader width="74px" />
            }
          </div>
          <div title={this.props.liquidationPrice.toFixed(18)} className="own-token-grid-row__col-liquidation-price opacityIn">
            {!this.state.isLoading
              ? <React.Fragment>
                <span className="sign-currency">$</span>{this.props.liquidationPrice.toFixed(2)}
              </React.Fragment>
              : <Preloader width="74px" />
            }
          </div>
          <div className="own-token-grid-row__col-collateral opacityIn">
            <div title={this.props.collateral.toFixed(18)} className="own-token-grid-row__col-collateral-wrapper">
              {!this.state.isLoading
                ? <React.Fragment>
                  <span><span className="sign-currency">$</span>{this.props.collateral.toFixed(2)}</span>
                  <span className={`own-token-grid-row__col-asset-collateral-small ${this.props.loan.collateralizedPercent.lte(.25) ? "danger" : ""}`}>{this.props.loan.collateralizedPercent.multipliedBy(100).plus(100).toFixed(2)}%</span>
                </React.Fragment>
                : <Preloader width="74px" />
              }
            </div>
            <div className="own-token-grid-row__open-manage-collateral" onClick={this.onManageClick}>
              <OpenManageCollateral />
            </div>
          </div>
          <div title={this.props.value.toFixed(18)} className="own-token-grid-row__col-position-value opacityIn">
            {!this.state.isLoading
              ? this.props.value
                ? <React.Fragment>
                  <span className="sign-currency">$</span>{this.props.value.toFixed(2)}
                </React.Fragment>
                : '$0.00'
              : <Preloader width="74px" />
            }
          </div>
          <div title={this.props.profit.toFixed(18)} className="own-token-grid-row__col-profit opacityIn">
            {!this.state.isLoading
              ? this.props.profit
                ? <React.Fragment>
                  <span><span className="sign-currency">$</span>{this.props.profit.toFixed(2)}</span>
                </React.Fragment>
                : '$0.00'
              : <Preloader width="74px" />
            }
          </div>
          <div className="own-token-grid-row__col-action opacityIn rightIn">
            <button className="own-token-grid-row_button own-token-grid-row__sell-button own-token-grid-row__button--size-half" onClick={this.onSellClick}>
              {TradeType.SELL}
            </button>
          </div>
        </div>
    )
  }

  public onDetailsClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    // this.props.onDetails(this.props.currentKey);
  };

  public onManageClick = async (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const request = new TradeRequest(
      this.props.loan.loanId,
      TradeType.SELL,
      this.props.tradeAsset,
      this.props.collateralAsset,
      this.props.collateralAsset,
      this.props.positionType,
      this.props.leverage,
      new BigNumber(0)
    )

    await this.setState({ ...this.state, request: request });
    this.props.changeLoadingTransaction(this.state.isLoadingTransaction, request, false, this.state.resultTx)

    this.props.onManageCollateralOpen(
      new ManageCollateralRequest(
        this.props.loan.loanId,
        this.props.tradeAsset,
        this.props.collateralAsset,
        this.props.loan.collateralAmount,
        false
      )
    );
  };

  public onSellClick = async (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const request = new TradeRequest(
      this.props.loan.loanId,
      TradeType.SELL,
      this.props.tradeAsset,
      this.props.collateralAsset,
      this.props.collateralAsset,
      this.props.positionType,
      this.props.leverage,
      new BigNumber(0)
    )
    await this.setState({ ...this.state, request: request });
    this.props.onTrade(request);
    this.props.changeLoadingTransaction(this.state.isLoadingTransaction, request, false, true);
  };
}
