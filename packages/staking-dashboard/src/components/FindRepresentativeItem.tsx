import { BigNumber } from '@0x/utils'
import React from 'react'
import { ReactComponent as BPTIcon } from '../assets/images/token-bpt.svg'
import { ReactComponent as BzrxIcon } from '../assets/images/token-bzrx.svg'
import { ReactComponent as VBzrxIcon } from '../assets/images/token-vbzrx.svg'
import { IRep } from '../domain/IRep'

export interface IFindRepresentativeItemProps {
  representative: IRep
  onRepClick: () => void
}

const networkName = process.env.REACT_APP_ETH_NETWORK

function formatAmount(value: BigNumber): string {
  if (value.lt(1000)) return value.toFixed(2)
  if (value.lt(10 ** 6)) return `${Number(value.dividedBy(1000).toFixed(2)).toString()}k`
  if (value.lt(10 ** 9)) return `${Number(value.dividedBy(10 ** 6).toFixed(2)).toString()}m`
  if (value.lt(10 ** 12)) return `${Number(value.dividedBy(10 ** 9).toFixed(2)).toString()}b`
  return `${Number(value.dividedBy(10 ** 12).toFixed(2)).toString()}T`
}

export function FindRepresentativeItem(props: IFindRepresentativeItemProps) {
  const { representative } = props
  const bzrxAmount = representative.BZRX.div(10 ** 18)
  const vbzrxAmount = representative.vBZRX.div(10 ** 18)
  // TODO: remove networkName
  const bptAmount =
    networkName === 'kovan'
      ? representative.LPToken.div(10 ** 6)
      : representative.LPToken.div(10 ** 18)

  return (
    <li className="item-find-representative" onClick={() => props.onRepClick()}>
      <img
        className="photo"
        src={representative.imageSrc}
        alt={`Representative ${representative.index}`}
      />
      <div className="name">{representative.name}</div>
      <div className="token" title={bzrxAmount.toFixed(18)}>
        <BzrxIcon />
        <span>{formatAmount(bzrxAmount)}</span>
      </div>
      <div className="token" title={vbzrxAmount.toFixed(18)}>
        <VBzrxIcon />
        <span>{formatAmount(vbzrxAmount)}</span>
      </div>
      <div className="token" title={bptAmount.toFixed(18)}>
        <BPTIcon />
        <span>{formatAmount(bptAmount)}</span>
      </div>
      {/*
      {representative.BZRX.gt(0) ?
        <div className="token" title={bzrxAmount.toFixed(18)}>
          <BzrxIcon />
          <span>{bzrxAmount.toFixed(2)}</span>
        </div>
        : <div className="token"></div>
      }
      {representative.vBZRX.gt(0) ?
        <div className="token" title={vbzrxAmount.toFixed(18)}>
          <VBzrxIcon />
          <span>{vbzrxAmount.toFixed(2)}</span>
        </div>
        : <div className="token"></div>
      }
      {representative.LPToken.gt(0) ?
        <div className="token" title={bptAmount.toFixed(18)}>
          <BPTIcon />
          <span>{bptAmount.toFixed(2)}</span>
        </div>
        : <div className="token"></div>
      }
      */}
    </li>
  )
}

export default React.memo(FindRepresentativeItem)
