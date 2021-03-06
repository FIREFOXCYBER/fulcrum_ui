import { BigNumber } from '@0x/utils'
import React, { Component } from 'react'
import { ReactComponent as OpenManageCollateral } from '../assets/images/openManageCollateral.svg'
import { Asset } from '../domain/Asset'
import { AssetsDictionary } from '../domain/AssetsDictionary'
import { IBorrowedFundsState } from '../domain/IBorrowedFundsState'
import { ManageCollateralRequest } from '../domain/ManageCollateralRequest'
import { PositionType } from '../domain/PositionType'
import { RequestStatus } from '../domain/RequestStatus'
import { RequestTask } from '../domain/RequestTask'
import { TradeRequest } from '../domain/TradeRequest'
import { TradeType } from '../domain/TradeType'
import { FulcrumProviderEvents } from '../services/events/FulcrumProviderEvents'
import { FulcrumProvider } from '../services/FulcrumProvider'
import { TasksQueue } from '../services/TasksQueue'
import { CircleLoader } from './CircleLoader'
import { Preloader } from './Preloader'
import { TradeTxLoaderStep } from './TradeTxLoaderStep'

export interface IInnerOwnTokenGridRowProps {
  loan: IBorrowedFundsState
  baseToken: Asset
  quoteToken: Asset
  leverage: number
  positionType: PositionType
  positionValue: BigNumber
  value: BigNumber
  collateral: BigNumber
  openPrice: BigNumber
  liquidationPrice: BigNumber
  profitCollateralToken: BigNumber
  profitLoanToken: BigNumber
  profitUSD: BigNumber
  maintenanceMargin: BigNumber
  isTxCompleted: boolean
  onTrade: (request: TradeRequest) => void
  onManageCollateralOpen: (request: ManageCollateralRequest) => void
  changeLoadingTransaction: (
    isLoadingTransaction: boolean,
    request: TradeRequest | ManageCollateralRequest | undefined,
    isTxCompleted: boolean,
    resultTx: boolean
  ) => void
}

interface IInnerOwnTokenGridRowState {
  isLoading: boolean
  isLoadingTransaction: boolean
  request: TradeRequest | ManageCollateralRequest | undefined
  valueChange: BigNumber
  resultTx: boolean
}

export class InnerOwnTokenGridRow extends Component<
  IInnerOwnTokenGridRowProps,
  IInnerOwnTokenGridRowState
> {
  constructor(props: IInnerOwnTokenGridRowProps, context?: any) {
    super(props, context)

    this._isMounted = false

    this.state = {
      isLoading: true,
      isLoadingTransaction: false,
      request: undefined,
      resultTx: false,
      valueChange: new BigNumber(0)
    }

    FulcrumProvider.Instance.eventEmitter.on(
      FulcrumProviderEvents.ProviderAvailable,
      this.onProviderAvailable
    )
    FulcrumProvider.Instance.eventEmitter.on(
      FulcrumProviderEvents.ProviderChanged,
      this.onProviderChanged
    )
    FulcrumProvider.Instance.eventEmitter.on(
      FulcrumProviderEvents.AskToOpenProgressDlg,
      this.onAskToOpenProgressDlg
    )
    FulcrumProvider.Instance.eventEmitter.on(
      FulcrumProviderEvents.AskToCloseProgressDlg,
      this.onAskToCloseProgressDlg
    )
    // FulcrumProvider.Instance.eventEmitter.on(FulcrumProviderEvents.TradeTransactionMined, this.onTradeTransactionMined);
  }

  private _isMounted: boolean

  private async derivedUpdate() {
    let openValue = new BigNumber(0)
    let valueChange = new BigNumber(0)

    if (this.props.positionType === PositionType.LONG) {
      const collateralAssetDecimals =
        AssetsDictionary.assets.get(this.props.loan.collateralAsset)!.decimals || 18
      openValue = this.props.loan.loanData.collateral
        .div(10 ** collateralAssetDecimals)
        .times(this.props.openPrice)
      valueChange = this.props.value
        .minus(openValue)
        .div(openValue)
        .times(100)
    } else {
      const loanAssetDecimals =
        AssetsDictionary.assets.get(this.props.loan.loanAsset)!.decimals || 18
      openValue = this.props.loan.loanData.principal
        .div(10 ** loanAssetDecimals)
        .times(this.props.openPrice)
      valueChange = this.props.value
        .minus(openValue)
        .div(openValue)
        .times(100)
    }

    this._isMounted &&
      this.setState({
        ...this.state,
        valueChange,
        isLoading: false
      })
  }

  private onProviderAvailable = async () => {
    await this.derivedUpdate()
  }

  private onProviderChanged = async () => {
    await this.derivedUpdate()
  }

  private onAskToOpenProgressDlg = (taskId: string) => {
    if (!this.state.request || taskId !== this.state.request.loanId) return
    this.setState({ ...this.state, isLoadingTransaction: true, resultTx: true })
    this.props.changeLoadingTransaction(
      this.state.isLoadingTransaction,
      this.state.request,
      false,
      this.state.resultTx
    )
  }
  private onAskToCloseProgressDlg = (task: RequestTask) => {
    if (!this.state.request || task.request.loanId !== this.state.request.loanId) return
    if (task.status === RequestStatus.FAILED || task.status === RequestStatus.FAILED_SKIPGAS) {
      window.setTimeout(async () => {
        await FulcrumProvider.Instance.onTaskCancel(task)
        this.setState({
          ...this.state,
          isLoadingTransaction: false,
          request: undefined,
          resultTx: false
        })
        this.props.changeLoadingTransaction(false, undefined, false, false)
      }, 5000)
      return
    }
    this.setState({ ...this.state, resultTx: true })
    this.props.changeLoadingTransaction(
      this.state.isLoadingTransaction,
      this.state.request,
      true,
      true
    )
  }

  // private onTradeTransactionMined = async (event: TradeTransactionMinedEvent) => {
  //   if (event.key.toString() === this.props.currentKey.toString()) {
  //     await this.derivedUpdate();
  //   }
  // };

  public componentWillUnmount(): void {
    this._isMounted = false

    FulcrumProvider.Instance.eventEmitter.off(
      FulcrumProviderEvents.ProviderAvailable,
      this.onProviderAvailable
    )
    FulcrumProvider.Instance.eventEmitter.off(
      FulcrumProviderEvents.ProviderChanged,
      this.onProviderChanged
    )
    FulcrumProvider.Instance.eventEmitter.off(
      FulcrumProviderEvents.AskToOpenProgressDlg,
      this.onAskToOpenProgressDlg
    )
    FulcrumProvider.Instance.eventEmitter.off(
      FulcrumProviderEvents.AskToCloseProgressDlg,
      this.onAskToCloseProgressDlg
    )
    // FulcrumProvider.Instance.eventEmitter.off(FulcrumProviderEvents.TradeTransactionMined, this.onTradeTransactionMined);
  }

  public async componentDidUpdate(
    prevProps: Readonly<IInnerOwnTokenGridRowProps>,
    prevState: Readonly<IInnerOwnTokenGridRowState>,
    snapshot?: any
  ) {
    if (this.props.isTxCompleted && prevProps.isTxCompleted !== this.props.isTxCompleted) {
      await this.derivedUpdate()
      if (this.state.isLoadingTransaction) {
        this.setState({ ...this.state, isLoadingTransaction: false, request: undefined })
        this.props.changeLoadingTransaction(
          this.state.isLoadingTransaction,
          this.state.request,
          false,
          this.state.resultTx
        )
      }
    }
  }

  public async componentDidMount() {
    this._isMounted = true

    const task = TasksQueue.Instance.getTasksList().find(
      (t) => t.request.loanId === this.props.loan.loanId
    )
    const isLoadingTransaction = task && !task.error ? true : false
    const request = task ? (task.request as TradeRequest | ManageCollateralRequest) : undefined
    this.setState({
      ...this.state,
      isLoadingTransaction,
      request
    })

    await this.derivedUpdate()
  }

  public render() {
    const collateralizedPercent = this.props.loan.collateralizedPercent.multipliedBy(100)

    let profitTitle = ''
    let profitValue
    if (this.props.profitUSD.eq(0)) {
      profitTitle =
        this.props.positionType === PositionType.LONG
          ? `${this.props.profitCollateralToken.toFixed()} | ${this.props.profitLoanToken.toFixed()}`
          : `${this.props.profitLoanToken.toFixed()} | ${this.props.profitCollateralToken.toFixed()}`
      profitValue =
        this.props.positionType === PositionType.LONG ? (
          <React.Fragment>
            {this.props.profitCollateralToken.toFixed(2)}&nbsp;
            <span className="inner-own-token-grid-row__line" />
            &nbsp;
            {this.props.profitLoanToken.toFixed(2)}
          </React.Fragment>
        ) : (
          <React.Fragment>
            {this.props.profitLoanToken.toFixed(2)}&nbsp;
            <span className="inner-own-token-grid-row__line" />
            &nbsp;
            {this.props.profitCollateralToken.toFixed(2)}
          </React.Fragment>
        )
    } else {
      profitTitle = `$${this.props.profitUSD.toFixed()}`
      profitValue = (
        <React.Fragment>
          <span className="sign-currency">$</span>
          {this.props.profitUSD.toFixed(2)}
        </React.Fragment>
      )
    }
    return (
      <React.Fragment>
        {this.state.isLoadingTransaction && this.state.request ? (
          <React.Fragment>
            <div className="token-selector-item__image">
              <CircleLoader />
              <TradeTxLoaderStep taskId={this.state.request.id} />
            </div>
          </React.Fragment>
        ) : (
          <div className={`inner-own-token-grid-row`}>
            <div
              title={this.props.positionValue.toFixed(18)}
              className="inner-own-token-grid-row__col-token-name-full opacityIn">
              <span className="inner-own-token-grid-row__body-header">
                Position <label className="text-asset">{this.props.baseToken}</label>
              </span>
              {this.props.positionValue.toFixed(4)}
            </div>
            <div
              title={this.props.loan.loanId}
              className="inner-own-token-grid-row__col-asset-type">
              <span className="position-type-marker">
                {`${this.props.leverage}x`}&nbsp; {this.props.positionType}
              </span>
            </div>
            <div
              title={`$${this.props.value.toFixed(18)}`}
              className="inner-own-token-grid-row__col-asset-price">
              <span className="inner-own-token-grid-row__body-header">
                Value <label className="text-asset">{this.props.quoteToken}</label>
              </span>
              {!this.state.isLoading ? (
                <React.Fragment>
                  <span className="value-currency">
                    {this.props.value.toFixed(2)}
                    <span
                      title={this.state.valueChange.toFixed(18)}
                      className="inner-own-token-grid-row__col-asset-price-small">
                      {this.state.valueChange.toFixed(2)}%
                    </span>
                  </span>
                </React.Fragment>
              ) : (
                <Preloader width="74px" />
              )}
            </div>
            <div className="inner-own-token-grid-row__col-asset-collateral">
              <span className="inner-own-token-grid-row__body-header">
                Collateral <label className="text-asset">{this.props.baseToken}</label>
              </span>

              {!this.state.isLoading ? (
                <React.Fragment>
                  <span className="value-currency">
                    <span title={this.props.collateral.toFixed(18)}>
                      {this.props.collateral.toFixed(2)}
                      <div
                        className={`inner-own-token-grid-row__open-manage-collateral ${
                          this.props.loan.collateralizedPercent.lte(this.props.maintenanceMargin)
                            ? 'danger'
                            : ''
                        }`}
                        onClick={this.onManageClick}>
                        <OpenManageCollateral />
                      </div>
                    </span>

                    <span
                      className={`inner-own-token-grid-row__col-asset-collateral-small ${
                        this.props.loan.collateralizedPercent.lte(
                          this.props.maintenanceMargin.plus(0.1)
                        )
                          ? 'danger'
                          : ''
                      }`}
                      title={collateralizedPercent.toFixed(18)}>
                      {collateralizedPercent.toFixed(2)}%
                    </span>
                  </span>
                </React.Fragment>
              ) : (
                <Preloader width="74px" />
              )}
            </div>
            <div
              title={this.props.openPrice.toFixed(18)}
              className="inner-own-token-grid-row__col-position-value opacityIn">
              <span className="inner-own-token-grid-row__body-header">
                Open Price <label className="text-asset">{this.props.quoteToken}</label>
              </span>

              {!this.state.isLoading ? (
                this.props.openPrice ? (
                  <React.Fragment>{this.props.openPrice.toFixed(2)}</React.Fragment>
                ) : (
                  '$0.00'
                )
              ) : (
                <Preloader width="74px" />
              )}
            </div>
            <div
              title={`$${this.props.liquidationPrice.toFixed(18)}`}
              className="inner-own-token-grid-row__col-liquidation-price opacityIn">
              <span className="inner-own-token-grid-row__body-header">
                Liquidation Price <label className="text-asset">{this.props.quoteToken}</label>
              </span>

              {!this.state.isLoading ? (
                <React.Fragment>{this.props.liquidationPrice.toFixed(2)}</React.Fragment>
              ) : (
                <Preloader width="74px" />
              )}
            </div>
            <div title={profitTitle} className="inner-own-token-grid-row__col-profit opacityIn">
              <span className="inner-own-token-grid-row__body-header">
                Profit{' '}
                <label className="text-asset">
                  {this.props.baseToken}/{this.props.quoteToken}
                </label>
              </span>
              {!this.state.isLoading ? profitValue : <Preloader width="74px" />}
            </div>
            <div className="inner-own-token-grid-row__col-action opacityIn rightIn">
              <button
                className="inner-own-token-grid-row_button inner-own-token-grid-row__sell-button inner-own-token-grid-row__button--size-half"
                onClick={this.onSellClick}
                disabled={this.props.loan.collateralizedPercent.lte(0.15)}>
                {TradeType.SELL}
              </button>
            </div>
          </div>
        )}
      </React.Fragment>
    )
  }

  public onDetailsClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  public onManageClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()

    const request = new ManageCollateralRequest(
      this.props.loan.loanId,
      this.props.loan.loanAsset,
      this.props.loan.collateralAsset,
      this.props.loan.collateralAmount,
      false
    )

    this.setState({ ...this.state, request: request })

    this.props.changeLoadingTransaction(
      this.state.isLoadingTransaction,
      request,
      false,
      this.state.resultTx
    )
    this.props.onManageCollateralOpen(request)
  }

  public onSellClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation()

    const request = new TradeRequest(
      this.props.loan.loanId,
      TradeType.SELL,
      this.props.baseToken,
      this.props.quoteToken,
      Asset.UNKNOWN,
      this.props.positionType,
      this.props.leverage,
      new BigNumber(0)
    )
    this.props.changeLoadingTransaction(
      this.state.isLoadingTransaction,
      request,
      false,
      this.state.resultTx
    )
    this.props.onTrade(request)
    this.setState({ ...this.state, request: request })
  }
}
