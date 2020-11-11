import { BigNumber } from '@0x/utils'
import React, { ChangeEvent } from 'react'

interface IStakeInputProps {
  currentBalance: BigNumber
  label: string
  max: BigNumber
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  tokenLogo: React.ReactNode
  value: string
}

export function InputStake(props: IStakeInputProps) {
  return (
    <div className="calc-item">
      <input
        className="add-to-balance__input"
        type="number"
        step="0.01"
        max={props.max.toFixed(2, 1)}
        title={props.currentBalance.toFixed(18)}
        value={props.value}
        onChange={props.onChange}
      />
      <div className="add-to-balance__range">
        <input
          step="0.01"
          type="range"
          min="0"
          max={props.max.toFixed(2, 1)}
          value={props.currentBalance.toFixed()}
          onChange={props.onChange}
        />
        <div className="line">
          <div />
          <div />
          <div />
          <div />
        </div>
        <div
          className="progress"
          style={{
            width: `calc(100%*${props.currentBalance}/${props.max})`
          }}
        />
      </div>
      {/* <span>{this.numberWithCommas(props.currentBalance)}</span> */}
      <label className="sign">{props.label}</label>
      {props.tokenLogo}
    </div>
  )
}

export default React.memo(InputStake)
