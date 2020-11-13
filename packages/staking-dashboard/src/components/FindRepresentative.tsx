import React, { ChangeEvent, PureComponent } from 'react'
import SimpleBar from 'simplebar-react'
import 'simplebar/dist/simplebar.min.css'
import { ReactComponent as CloseIcon } from '../assets/images/ic__close.svg'
import { ReactComponent as Search } from '../assets/images/icon-search.svg'
import FindRepresentativeItem from '../components/FindRepresentativeItem'
import { IRep } from '../domain/IRep'

export interface IFindRepresentativeProps {
  repsList: IRep[]
  onFindRepresentativeClose: () => void
  onAddRepresentative: (wallet: string) => void
}

export function FindRepresentative(props: IFindRepresentativeProps) {
  const { repsList, onFindRepresentativeClose, onAddRepresentative } = props
  const [searchValue, setSearchValue] = React.useState('')
  const searchVal = searchValue.toLowerCase()

  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value ? event.target.value : ''
    setSearchValue(value)
  }

  const representativeData = repsList
    .filter((rep) => rep.wallet.match(searchVal) || rep.name.toLowerCase().match(searchVal))
    .map((rep) => (
      <FindRepresentativeItem
        key={rep.wallet}
        representative={rep}
        onRepClick={() => onAddRepresentative(rep.wallet)}
      />
    ))
  return (
    <div className="modal find-representative">
      <div className="modal__title">
        Find a Representative
        <div onClick={onFindRepresentativeClose}>
          <CloseIcon className="modal__close" />
        </div>
      </div>
      <div>
        <div className="input-wrapper">
          <Search />
          <input placeholder="Search" onChange={onSearch} value={searchValue} />
        </div>
        <div className="header-find-representative">
          <span className="representative">Representative</span>
          <span className="stake">Stake</span>
        </div>
        <ul>
          <SimpleBar style={{ maxHeight: '50vh' }} autoHide={false}>
            {representativeData}
          </SimpleBar>
        </ul>
      </div>
    </div>
  )
}

export default React.memo(FindRepresentative)
