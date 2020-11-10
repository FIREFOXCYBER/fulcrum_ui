import { Web3ProviderEngine } from '@0x/subproviders'
import { Web3Wrapper } from '@0x/web3-wrapper'
import { Web3ReactProvider } from '@web3-react/core'
import { ConnectorEvent } from '@web3-react/types'
import React, { PureComponent } from 'react'
import Intercom from 'react-intercom'
import Modal from 'react-modal'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import appConfig from '../config/appConfig'
import { ProviderTypeDictionary } from '../domain/ProviderTypeDictionary'
import { Web3ConnectionFactory } from '../domain/Web3ConnectionFactory'
import Footer from '../layout/Footer'
import DashboardPage from '../pages/DashboardPage'
import { ProviderChangedEvent } from '../services/events/ProviderChangedEvent'
import { StakingProviderEvents } from '../services/events/StakingProviderEvents'
import stakingProvider from '../services/StakingProvider'
import LocationListener from './LocationListener'
import ProviderMenu from './ProviderMenu'

interface IAppRouterState {
  isProviderMenuModalOpen: boolean
  isLoading: boolean
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
      web3: stakingProvider.web3Wrapper,
      isMobileMedia: false
    }
    stakingProvider.on(StakingProviderEvents.ProviderChanged, this.onProviderChanged)
    stakingProvider.on(StakingProviderEvents.ProviderIsChanging, this.onProviderChanging)
  }

  public onProviderChanging = () => {
    this.setState({ isLoading: true, isProviderMenuModalOpen: false })
  }

  public onRequestClose = async () => {
    if (this._isMounted) {
      this.setState({ isProviderMenuModalOpen: false })
    }
  }

  private didResize = () => {
    if (this._isMounted) {
      const isMobileMedia = window.innerWidth <= 767
      if (isMobileMedia !== this.state.isMobileMedia) {
        this.setState({ isMobileMedia })
      }
    }
  }

  public componentWillUnmount(): void {
    this._isMounted = false
    stakingProvider.removeListener(StakingProviderEvents.ProviderChanged, this.onProviderChanged)
    window.removeEventListener('resize', this.didResize)
  }

  public componentDidMount(): void {
    this._isMounted = true
    window.addEventListener('resize', this.didResize)
    this.didResize()
    this.doNetworkConnect()
  }

  public getLibrary = async (provider: any, connector: any): Promise<Web3ProviderEngine> => {
    // handle connectors events (i.e. network changed)
    await stakingProvider.setWeb3Provider(connector)
    if (!connector.listeners(ConnectorEvent.Update).includes(stakingProvider.onConnectorUpdated)) {
      connector.on(ConnectorEvent.Update, stakingProvider.onConnectorUpdated)
    }
    return Web3ConnectionFactory.currentWeb3Engine
  }

  public doNetworkConnect = () => {
    if (this._isMounted && !this.state.isProviderMenuModalOpen) {
      this.setState({ isProviderMenuModalOpen: true })
    }
  }

  public onProviderChanged = (event: ProviderChangedEvent) => {
    this.setState({ isLoading: false, isProviderMenuModalOpen: false, web3: event.web3 })
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
            onSelect={stakingProvider.setWeb3Provider}
            onDeactivate={stakingProvider.deactivate}
            onProviderMenuClose={this.onRequestClose}
          />
        </Modal>

        {appConfig.isMainnetProd ? <Intercom appID="dfk4n5ut" /> : null}
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
