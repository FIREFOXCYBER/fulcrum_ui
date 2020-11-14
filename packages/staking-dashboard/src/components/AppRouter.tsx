import { Web3ReactProvider } from '@web3-react/core'
import React, { PureComponent } from 'react'
import Intercom from 'react-intercom'
import Modal from 'react-modal'
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom'
import appConfig from '../config/appConfig'
import { ProviderTypeDictionary } from '../domain/ProviderTypeDictionary'
import Footer from '../layout/Footer'
import DashboardPage from '../pages/DashboardPage'
import { ProviderChangedEvent } from '../services/events/ProviderChangedEvent'
import { StakingProviderEvents } from '../services/events/StakingProviderEvents'
import stakingProvider from '../services/StakingProvider'
import ProviderMenu from './ProviderMenu'

interface IAppRouterState {
  isProviderMenuModalOpen: boolean
  isLoading: boolean
  isMobileMedia: boolean
}

export default class AppRouter extends PureComponent<any, IAppRouterState> {
  private _isMounted: boolean = false

  constructor(props: any) {
    super(props)
    this.state = {
      isProviderMenuModalOpen: false,
      isLoading: false,
      isMobileMedia: false
    }
  }

  public onProviderChanging = () => {
    this.setState({ isLoading: true, isProviderMenuModalOpen: false })
  }

  public closeProviderMenu = async () => {
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
    stakingProvider.off(StakingProviderEvents.ProviderIsChanging, this.onProviderChanging)
    stakingProvider.off(StakingProviderEvents.ProviderChanged, this.onProviderChanged)
    window.removeEventListener('resize', this.didResize)
  }

  public componentDidMount(): void {
    this._isMounted = true
    stakingProvider.on(StakingProviderEvents.ProviderChanged, this.onProviderChanged)
    stakingProvider.on(StakingProviderEvents.ProviderIsChanging, this.onProviderChanging)
    this.didResize()
    this.doNetworkConnect()
    window.addEventListener('resize', this.didResize)
  }

  public doNetworkConnect = () => {
    if (this._isMounted && !this.state.isProviderMenuModalOpen) {
      this.setState({ isProviderMenuModalOpen: true })
    }
  }

  public onProviderChanged = (event: ProviderChangedEvent) => {
    this.setState({ isLoading: false, isProviderMenuModalOpen: false })
  }

  public render() {
    return (
      <Web3ReactProvider getLibrary={stakingProvider.getLibrary}>
        <Modal
          isOpen={this.state.isProviderMenuModalOpen}
          onRequestClose={this.closeProviderMenu}
          className="modal-content-div"
          overlayClassName="modal-overlay-div"
          ariaHideApp={false}>
          <ProviderMenu
            providerTypes={ProviderTypeDictionary.WalletProviders}
            isMobileMedia={this.state.isMobileMedia}
            onSelect={stakingProvider.setWeb3Provider}
            onDeactivate={stakingProvider.deactivate}
            onProviderMenuClose={this.closeProviderMenu}
          />
        </Modal>

        {appConfig.isMainnetProd ? <Intercom appID="dfk4n5ut" /> : null}
        <Router>
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
        </Router>
        <Footer />
      </Web3ReactProvider>
    )
  }
}
