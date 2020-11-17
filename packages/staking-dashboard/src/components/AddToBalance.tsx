import { BigNumber } from '@0x/utils'
import React, { ChangeEvent, PureComponent } from 'react'
import stakingUtils from '../lib/stakingUtils'
import InputStake from './InputStake'

/**
 * Balances (Max) are BigNumbers already divided by the token decimals
 */
interface IAddToBalanceProps {
  [x: string]: any
  bzrxMax: BigNumber
  vbzrxMax: BigNumber
  bptMax: BigNumber
  stake: (bzrx: BigNumber, vbzrx: BigNumber, bpt: BigNumber) => void
}

interface IAddToBalanceState {
  [x: string]: any
  bzrxInput: string
  vbzrxInput: string
  bptInput: string
}

export default class AddToBalance extends PureComponent<IAddToBalanceProps, IAddToBalanceState> {
  constructor(props: any, context?: any) {
    super(props, context)

    this.state = {
      bzrxInput: props.bzrxMax.toFixed(2, 1),
      vbzrxInput: props.vbzrxMax.toFixed(2, 1),
      bptInput: props.bptMax.toFixed(2, 1)
    }
  }

  public componentDidUpdate(prevProps: IAddToBalanceProps): void {
    if (
      this.props.bzrxMax !== prevProps.bzrxMax ||
      this.props.vbzrxMax !== prevProps.vbzrxMax ||
      this.props.bptMax !== prevProps.bptMax
    ) {
      this.setState({
        bzrxInput: this.props.bzrxMax.toFixed(2, 1),
        vbzrxInput: this.props.vbzrxMax.toFixed(2, 1),
        bptInput: this.props.bptMax.toFixed(2, 1)
      })
    }
  }

  /**
   * Returns all input amounts as big numbers and in base unit (* 10^18)
   */
  get inputsAsBigNumbers() {
    return {
      bzrxInput: new BigNumber(this.state.bzrxInput),
      vbzrxInput: new BigNumber(this.state.vbzrxInput),
      bptInput: new BigNumber(this.state.bptInput)
    }
  }

  get canStake() {
    const { bzrxInput, vbzrxInput, bptInput } = this.inputsAsBigNumbers
    const { bzrxMax, vbzrxMax, bptMax } = this.props
    const userBalances = {bzrx: bzrxMax, vbzrx: vbzrxMax, bpt: bptMax}
    const tokensToStake = {bzrx: bzrxInput, vbzrx: vbzrxInput, bpt: bptInput}
    return stakingUtils.verifyStake(userBalances, tokensToStake)
  }

  public render() {
    return (
      <React.Fragment>
        <div className="add-to-balance calculator-row">
          <label>Add to staking balance</label>
          {this.props.bzrxMax.gt(0) && (
            <InputStake
              id="bzrx"
              label="BZRX"
              max={this.props.bzrxMax}
              onChange={this.changeTokenBalance}
              value={this.state.bzrxInput}
            />
          )}
          {this.props.vbzrxMax.gt(0) && (
            <InputStake
              id="vbzrx"
              label="vBZRX"
              max={this.props.vbzrxMax}
              onChange={this.changeTokenBalance}
              value={this.state.vbzrxInput}
            />
          )}
          {this.props.bptMax.gt(0) && (
            <InputStake
              id="bpt"
              label="BPT"
              max={this.props.bptMax}
              onChange={this.changeTokenBalance}
              value={this.state.bptInput}
            />
          )}

          <div className="group-buttons">
            <button
              title="Stake"
              className="button full-button blue"
              disabled={!this.canStake}
              onClick={this.stake}>
              Stake
            </button>
          </div>
        </div>
      </React.Fragment>
    )
  }

  private stake = () => {
    const { bzrxInput, vbzrxInput, bptInput } = this.inputsAsBigNumbers
    this.props.stake(bzrxInput, vbzrxInput, bptInput)
  }

  private formatPrecision = (output: string) => {
    if (output.match(/^(\d+\.{1}0?)$/)) {
      return output
    }
    return Number(parseFloat(output).toFixed(2)).toPrecision()
  }

  private changeTokenBalance = (event: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.currentTarget
    const walletBalance = this.props[`${id}Max`] as BigNumber
    const valueBN = new BigNumber(value)
    let newInputValue = value

    if (valueBN.gt(walletBalance)) {
      newInputValue = walletBalance.toFixed(2, 1)
    } else if (valueBN.lt(0) || !value) {
      newInputValue = '0'
    } else {
      newInputValue = this.formatPrecision(value)
    }

    this.setState({ [`${id}Input`]: newInputValue })
  }
}
