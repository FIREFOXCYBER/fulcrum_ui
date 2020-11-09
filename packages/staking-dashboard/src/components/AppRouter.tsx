import { Web3ProviderEngine } from '@0x/subproviders'
import { Web3Wrapper } from '@0x/web3-wrapper'
import { AbstractConnector } from '@web3-react/abstract-connector'
import { Web3ReactProvider } from '@web3-react/core'
import { ConnectorEvent, ConnectorUpdate } from '@web3-react/types'
import React, { PureComponent } from 'react'
import Intercom from 'react-intercom'
import Modal from 'react-modal'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import { ProviderType } from '../domain/ProviderType'
import { ProviderTypeDictionary } from '../domain/ProviderTypeDictionary'
import { Web3ConnectionFactory } from '../domain/Web3ConnectionFactory'
import Footer from '../layout/Footer'
import DashboardPage from '../pages/DashboardPage'
import { ProviderChangedEvent } from '../services/events/ProviderChangedEvent'
import { StakingProviderEvents } from '../services/events/StakingProviderEvents'
import stakingProvider from '../services/StakingProvider'
import LocationListener from './LocationListener'
import ProviderMenu from './ProviderMenu'

const isMainnetProd =
  process.env.NODE_ENV &&
  process.env.NODE_ENV !== 'development' &&
  process.env.REACT_APP_ETH_NETWORK === 'mainnet'

interface IAppRouterState {
  isProviderMenuModalOpen: boolean
  isLoading: boolean
  selectedProviderType: ProviderType
  web3: Web3Wrapper | null
  isMobileMedia: boolean
}

export default class AppRouter extends PureComponent<any, IAppRouterState> {
  private _isMounted: boolean = false

  constructor(props: any) {
    super(props)
    this.state = {
      isProviderMenuModalOpen: false,
      isLoading: false,
      selectedProviderType: stakingProvider.providerType,
      web3: stakingProvider.web3Wrapper,
      isMobileMedia: false
    }
    stakingProvider.on(
      StakingProviderEvents.ProviderChanged,
      this.onProviderChanged
    )
  }

  public async onConnectorUpdated(update: ConnectorUpdate) {
    stakingProvider.emit(StakingProviderEvents.ProviderIsChanging)

    await Web3ConnectionFactory.updateConnector(update)
    await stakingProvider.setWeb3ProviderFinalize(stakingProvider.providerType)
    stakingProvider.emit(
      StakingProviderEvents.ProviderChanged,
      new ProviderChangedEvent(
        stakingProvider.providerType,
        stakingProvider.web3Wrapper
      )
    )
  }

  public onDeactivate = async () => {
    stakingProvider.isLoading = true
    stakingProvider.emit(StakingProviderEvents.ProviderIsChanging)
    if (!this._isMounted) {
      return
    }

    this.setState({
      ...this.state,
      isProviderMenuModalOpen: false
    })

    await stakingProvider.setReadonlyWeb3Provider()

    stakingProvider.isLoading = false
    stakingProvider.emit(
      StakingProviderEvents.ProviderChanged,
      new ProviderChangedEvent(
        stakingProvider.providerType,
        stakingProvider.web3Wrapper
      )
    )
  }

  public onProviderTypeSelect = async (connector: AbstractConnector, account?: string) => {
    console.log('onProviderTypeSelect')
    if (!this.state.isLoading) {
      stakingProvider.isLoading = true
      stakingProvider.emit(StakingProviderEvents.ProviderIsChanging)

      if (!this._isMounted) {
        return
      }
      this.setState(
        {
          ...this.state,
          isLoading: true,
          isProviderMenuModalOpen: false
        },
        async () => {
          await stakingProvider.setWeb3Provider(connector, account)

          stakingProvider.isLoading = false

          stakingProvider.emit(
            StakingProviderEvents.ProviderChanged,
            new ProviderChangedEvent(
              stakingProvider.providerType,
              stakingProvider.web3Wrapper
            )
          )
          if (this._isMounted) {
            this.setState({
              ...this.state,
              isLoading: false
            })
          }
        }
      )
    } else {
      if (!this._isMounted) {
        return
      }
      this.setState({
        ...this.state,
        isProviderMenuModalOpen: false
      })
    }
  }

  public onRequestClose = async () => {
    if (!this._isMounted) {
      return
    }
    this.setState({
      ...this.state,
      isProviderMenuModalOpen: false
    })
  }

  public componentWillUnmount(): void {
    this._isMounted = false
    stakingProvider.removeListener(
      StakingProviderEvents.ProviderChanged,
      this.onProviderChanged
    )
    window.removeEventListener('resize', this.didResize.bind(this))
  }

  public componentDidMount(): void {
    this._isMounted = true
    window.addEventListener('resize', this.didResize.bind(this))
    this.didResize()
    this.doNetworkConnect()
  }

  private didResize = () => {
    if (!this._isMounted) {
      return
    }
    const isMobileMedia = window.innerWidth <= 767
    if (isMobileMedia !== this.state.isMobileMedia) {
      this.setState({ isMobileMedia })
    }
  }

  public getLibrary = async (provider: any, connector: any): Promise<Web3ProviderEngine> => {
    // handle connectors events (i.e. network changed)
    await this.onProviderTypeSelect(connector)
    if (!connector.listeners(ConnectorEvent.Update).includes(this.onConnectorUpdated)) {
      connector.on(ConnectorEvent.Update, this.onConnectorUpdated)
    }
    return Web3ConnectionFactory.currentWeb3Engine
  }

  public doNetworkConnect = () => {
    if (!this._isMounted) {
      return
    }
    if (!this.state.isProviderMenuModalOpen) {
      this.setState({ ...this.state, isProviderMenuModalOpen: true })
    }
  }

  public onProviderChanged = async (event: ProviderChangedEvent) => {
    if (!this._isMounted) {
      return
    }
    this.setState({
      ...this.state,
      selectedProviderType: event.providerType,
      isLoading: false,
      web3: event.web3
    })
  }

  public render() {
    return (
      <Web3ReactProvider getLibrary={this.getLibrary}>
        <Modal
          isOpen={this.state.isProviderMenuModalOpen}
          onRequestClose={this.onRequestClose}
          className="modal-content-div"
          overlayClassName="modal-overlay-div"
          ariaHideApp={false}>
          <ProviderMenu
            providerTypes={ProviderTypeDictionary.WalletProviders}
            isMobileMedia={this.state.isMobileMedia}
            onSelect={this.onProviderTypeSelect}
            onDeactivate={this.onDeactivate}
            onProviderMenuClose={this.onRequestClose}
          />
        </Modal>

        {isMainnetProd ? <Intercom appID="dfk4n5ut" /> : null}
        <Router>
          <LocationListener doNetworkConnect={this.doNetworkConnect}>
            <Switch>
              <Route exact={true} path="/">
                <DashboardPage
                  isMobileMedia={this.state.isMobileMedia}
                  doNetworkConnect={this.doNetworkConnect}
                />
              </Route>
              {/* <Route path="/transactions">
                <TransactionsPage isMobileMedia={this.state.isMobileMedia} doNetworkConnect={this.doNetworkConnect} />
              </Route> */}
            </Switch>
          </LocationListener>
        </Router>
        <Footer />
      </Web3ReactProvider>
    )
  }
}
