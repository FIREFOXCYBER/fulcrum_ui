import { AbstractConnector } from '@web3-react/abstract-connector'
import { useWeb3React } from '@web3-react/core'
import React from 'react'
import { ReactComponent as CloseIcon } from '../assets/images/ic__close.svg'
import { ProviderType } from '../domain/ProviderType'
import { ProviderTypeDictionary } from '../domain/ProviderTypeDictionary'
import { injected } from '../domain/WalletConnectors'
import stakingProvider from '../services/StakingProvider'
import { ProviderMenuListItem } from './ProviderMenuListItem'

export interface IProviderMenuProps {
  providerTypes: ProviderType[]
  isMobileMedia: boolean
  onSelect: (selectedConnector: AbstractConnector, account?: string) => void
  onDeactivate: () => void
  onProviderMenuClose: () => void
}

export default function ProviderMenu(props: IProviderMenuProps) {
  const context = useWeb3React()
  const { connector, account, activate, deactivate, active, error } = context

  // handle logic to recognize the connector currently being activated
  // @ts-ignore
  const [activatingConnector, setActivatingConnector] = React.useState()
  React.useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      if (active && connector && account) {
        props.onSelect(connector, account)
      }
      setActivatingConnector(undefined)
    }
  }, [activatingConnector, connector])

  // handle logic to eagerly connect to the injected ethereum provider, if it exists and has granted access already
  if (
    !activatingConnector &&
    connector !== injected &&
    props.isMobileMedia &&
    stakingProvider.providerType !== ProviderType.MetaMask
  ) {
    // @ts-ignore
    setActivatingConnector(injected)
    activate(injected).catch((err) => console.error(err))
  }

  const storedProvider: any = stakingProvider.getLocalstorageItem('providerType')
  const providerType: ProviderType | null = (storedProvider as ProviderType) || null
  if (!activatingConnector && providerType && providerType !== stakingProvider.providerType) {
    // @ts-ignore
    setActivatingConnector(ProviderTypeDictionary.getConnectorByProviderType(providerType)!)
    activate(ProviderTypeDictionary.getConnectorByProviderType(providerType)!).catch((err) =>
      console.error(err)
    )
  }

  // handle logic to connect in reaction to certain events on the injected ethereum provider, if it exists
  // useInactiveListener(!triedEager || !!activatingConnector);
  const renderItems = () => {
    return props.providerTypes.map((e) => {
      const currentConnector = ProviderTypeDictionary.getConnectorByProviderType(e)
      const activating = currentConnector === activatingConnector
      const connected = currentConnector === connector && active
      return (
        <ProviderMenuListItem
          key={e}
          providerType={e}
          isConnected={connected}
          isActivating={activating}
          onSelect={() => {
            if (!currentConnector) return
            // @ts-ignore
            setActivatingConnector(currentConnector)
            // tslint:disable-next-line
            activate(currentConnector, (err) => console.error(err))
          }}
        />
      )
    })
  }

  return (
    <div className="provider-menu">
      <div className="provider-menu__title">
        Select Wallet
        <div onClick={props.onProviderMenuClose}>
          <CloseIcon className="disclosure__close" />
        </div>
      </div>
      <ul className="provider-menu__list">{renderItems()}</ul>
      <button
        className="disconnect"
        key={ProviderType.None}
        onClick={() => {
          deactivate()
          props.onDeactivate()
        }}>
        Disconnect
      </button>
    </div>
  )
}
