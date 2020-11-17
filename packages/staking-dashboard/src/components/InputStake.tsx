import { BigNumber } from '@0x/utils'
import React, { ChangeEvent } from 'react'
import { ReactComponent as TokenBpt } from '../assets/images/token-bpt.svg'
import { ReactComponent as TokenBzrx } from '../assets/images/token-bzrx.svg'
import { ReactComponent as TokenVBzrx } from '../assets/images/token-vbzrx.svg'

const icons: { [index: string]: React.ReactNode } = {
  bzrx: <TokenBzrx className="token-logo" />,
  vbzrx: <TokenVBzrx className="token-logo" />,
  bpt: <TokenBpt className="token-logo" />
}

interface IStakeInputProps {
  id: string
  label: string
  max: BigNumber
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  value: string
}

export function InputStake(props: IStakeInputProps) {
  return (
    <div className="calc-item">
      <input
        id={props.id}
        className="add-to-balance__input"
        type="number"
        step="0.01"
        max={props.max.toFixed(2, 1)}
        title={props.value}
        value={props.value}
        onChange={props.onChange}
      />
      <div className="add-to-balance__range">
        <input
          id={props.id}
          step="0.01"
          type="range"
          min="0"
          max={props.max.toFixed(2, 1)}
          value={props.value}
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
            width: `calc(100%*${props.value}/${props.max})`
          }}
        />
      </div>
      <label className="sign">{props.label}</label>
      {icons[props.id]}
    </div>
  )
}

export default React.memo(InputStake)
