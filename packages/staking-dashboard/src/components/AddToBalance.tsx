import { BigNumber } from '@0x/utils'
import React, { ChangeEvent, PureComponent } from 'react'
import { ReactComponent as TokenBpt } from '../assets/images/token-bpt.svg'
import { ReactComponent as TokenBzrx } from '../assets/images/token-bzrx.svg'
import { ReactComponent as TokenVBzrx } from '../assets/images/token-vbzrx.svg'
import appConfig from '../config/appConfig'
import InputStake from './InputStake'

interface IAddToBalanceProps {
  bzrxMax: BigNumber
  vbzrxMax: BigNumber
  bptMax: BigNumber
  stake: (bzrx: BigNumber, vbzrx: BigNumber, bpt: BigNumber) => void
}

interface IAddToBalanceState {
  bzrxBalance: BigNumber
  vBzrxBalance: BigNumber
  bptBalance: BigNumber
  inputBzrxBalance: string
  inputVBzrxBalance: string
  inputBptBalance: string
  bzrxInputInBaseUnits: BigNumber
  vbzrxInputInBaseUnits: BigNumber
  bptInputInBaseUnits: BigNumber
}

export default class AddToBalance extends PureComponent<IAddToBalanceProps, IAddToBalanceState> {
  constructor(props: any, context?: any) {
    super(props, context)

    this.state = {
      bzrxBalance: props.bzrxMax,
      vBzrxBalance: props.vbzrxMax,
      bptBalance: props.bptMax,
      inputBzrxBalance: props.bzrxMax.toFixed(2),
      inputVBzrxBalance: props.vbzrxMax.toFixed(2),
      inputBptBalance: props.bptMax.toFixed(2),
      bzrxInputInBaseUnits: props.bzrxMax.times(10 ** 18),
      vbzrxInputInBaseUnits: props.vbzrxMax.times(10 ** 18),
      bptInputInBaseUnits: appConfig.isKovan
        ? this.props.bptMax.times(10 ** 6)
        : this.props.bptMax.times(10 ** 18)
    }
  }

  public componentDidUpdate(prevProps: IAddToBalanceProps): void {
    if (
      this.props.bzrxMax !== prevProps.bzrxMax ||
      this.props.vbzrxMax !== prevProps.vbzrxMax ||
      this.props.bptMax !== prevProps.bptMax
    ) {
      this.setState({
        bzrxBalance: this.props.bzrxMax,
        vBzrxBalance: this.props.vbzrxMax,
        bptBalance: this.props.bptMax,
        inputBzrxBalance: this.props.bzrxMax.toFixed(2),
        inputVBzrxBalance: this.props.vbzrxMax.toFixed(2),
        inputBptBalance: this.props.bptMax.toFixed(2)
      })
    }
  }

  public render() {
    return (
      <React.Fragment>
        <div className="add-to-balance calculator-row">
          <label>Add to staking balance</label>
          {this.props.bzrxMax.gt(0) && (
            <InputStake
              currentBalance={this.state.bzrxBalance}
              label="BZRX"
              max={this.props.bzrxMax}
              onChange={this.changeBzrxBalance}
              tokenLogo={<TokenBzrx className="token-logo" />}
              value={this.state.inputBzrxBalance}
            />
          )}
          {this.props.vbzrxMax.gt(0) && (
            <InputStake
              currentBalance={this.state.vBzrxBalance}
              label="vBZRX"
              max={this.props.vbzrxMax}
              onChange={this.changeVBzrxBalance}
              tokenLogo={<TokenVBzrx className="token-logo" />}
              value={this.state.inputVBzrxBalance}
            />
          )}
          {this.props.bptMax.gt(0) && (
            <InputStake
              currentBalance={this.state.bptBalance}
              label="BPT"
              max={this.props.bptMax}
              onChange={this.changeBptBalance}
              tokenLogo={<TokenBpt className="token-logo" />}
              value={this.state.inputBptBalance}
            />
          )}

          <div className="group-buttons">
            <button
              title="Stake"
              className="button full-button blue"
              disabled={
                !this.state.bptBalance && !this.state.vBzrxBalance && !this.state.bzrxBalance
              }
              onClick={this.stake}>
              Stake
            </button>
            {/*<button title="Stake" className="button half-button blue" disabled={(!this.state.bptBalance && !this.state.vBzrxBalance && !this.state.bzrxBalance)}>Stake</button>
                          <button title="Unstake" className="button half-button red" disabled={(!this.state.bptBalance && !this.state.vBzrxBalance && !this.state.bzrxBalance)}>Unstake</button>*/}
          </div>
        </div>
      </React.Fragment>
    )
  }

  private stake = () => {
    this.props.stake(
      this.state.bzrxInputInBaseUnits,
      this.state.vbzrxInputInBaseUnits,
      this.state.bptInputInBaseUnits
    )
  }

  private changeBzrxBalance = (e: ChangeEvent<HTMLInputElement>) => {
    const maxInputValue = parseFloat(e.currentTarget.getAttribute('max')!).toFixed(2)
    const inputValue = e.currentTarget.value
    const result = this.changeBalance(inputValue, this.props.bzrxMax)
    const bzrxInputInBaseUnits =
      maxInputValue && maxInputValue === result.inputBalance
        ? new BigNumber(this.props.bzrxMax).times(10 ** 18)
        : new BigNumber(result.inputBalance).times(10 ** 18)
    this.setState({
      bzrxBalance: result.balance,
      inputBzrxBalance: result.inputBalance,
      bzrxInputInBaseUnits
    })
  }

  private changeVBzrxBalance = (e: ChangeEvent<HTMLInputElement>) => {
    const maxInputValue = parseFloat(e.currentTarget.getAttribute('max')!).toFixed(2)
    const inputValue = e.currentTarget.value
    const result = this.changeBalance(inputValue, this.props.vbzrxMax)
    const vbzrxInputInBaseUnits =
      maxInputValue && maxInputValue === result.inputBalance
        ? new BigNumber(this.props.vbzrxMax).times(10 ** 18)
        : new BigNumber(result.inputBalance).times(10 ** 18)
    this.setState({
      vBzrxBalance: result.balance,
      inputVBzrxBalance: result.inputBalance,
      vbzrxInputInBaseUnits
    })
  }

  private changeBptBalance = (e: ChangeEvent<HTMLInputElement>) => {
    const maxInputValue = parseFloat(e.currentTarget.getAttribute('max')!).toFixed(2)
    const inputValue = e.currentTarget.value
    const result = this.changeBalance(inputValue, this.props.bptMax)
    const bptInputInBaseUnits =
      maxInputValue && maxInputValue === result.inputBalance
        ? appConfig.isKovan
          ? new BigNumber(this.props.bptMax).times(10 ** 6)
          : new BigNumber(this.props.bptMax).times(10 ** 18)
        : appConfig.isKovan
        ? new BigNumber(result.inputBalance).times(10 ** 6)
        : new BigNumber(result.inputBalance).times(10 ** 18)
    this.setState({
      bptBalance: result.balance,
      inputBptBalance: result.inputBalance,
      bptInputInBaseUnits
    })
  }

  private changeBalance = (balanceText: string, walletBalance: BigNumber) => {
    const balance = new BigNumber(balanceText)
    if (balance.gt(walletBalance)) {
      return {
        balance: walletBalance,
        inputBalance: walletBalance.toFixed(2, 1)
      }
    }
    if (balance.lt(0) || !balanceText) {
      return {
        balance: new BigNumber(0),
        inputBalance: '0'
      }
    }

    const inputBalance = this.formatPrecision(balanceText)

    return { balance: new BigNumber(inputBalance), inputBalance }
  }

  private formatPrecision = (output: string) => {
    if (output.match(/^(\d+\.{1}0?)$/)) return output

    return Number(parseFloat(output).toFixed(2)).toPrecision()
  }
}
