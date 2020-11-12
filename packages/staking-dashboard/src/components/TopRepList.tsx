import React from 'react'
import { IRep } from '../domain/IRep'

interface ITopRepList {
  topRepsList: IRep[]
  delegateAddress: string
  selectedRepAddress: string
  setSelectedRepAddressClick: (e: React.MouseEvent<HTMLElement>) => void
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function TopRepList(props: ITopRepList) {
  const { topRepsList, delegateAddress, selectedRepAddress, setSelectedRepAddressClick } = props

  return (
    <div className="calculator-row">
      <div className="row-header">Please select representative:</div>
      <ul
        className={`group-buttons ${
          delegateAddress.toLowerCase() !== ZERO_ADDRESS ? 'selected-delegate' : ''
        }`}>
        {topRepsList.map((e) => {
          const cssClass = `button button-representative ${
            e.wallet.toLowerCase() === selectedRepAddress.toLowerCase() ? 'active' : 'no-active'
          }`
          return (
            <li
              key={e.wallet}
              className={cssClass}
              onClick={setSelectedRepAddressClick}
              data-address={e.wallet}>
              <img className="photo" src={e.imageSrc} alt={`Representative ${e.index}`} />
              <span className="name">{e.name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default React.memo(TopRepList)
