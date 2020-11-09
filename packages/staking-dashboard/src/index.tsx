import React from 'react'
import ReactDOM from 'react-dom'
import TagManager from 'react-gtm-module'
import AppRouter from './components/AppRouter'
import configProviders from './config/providers.json'

import './styles/index.scss'

const isMainnetProd =
  process.env.NODE_ENV &&
  process.env.NODE_ENV !== 'development' &&
  process.env.REACT_APP_ETH_NETWORK === 'mainnet'

if (isMainnetProd) {
  const tagManagerArgs = {
    gtmId: configProviders.Google_TrackingID,
    dataLayer: {
      name: 'Home',
      status: 'Intailized'
    }
  }
  TagManager.initialize(tagManagerArgs)
}

ReactDOM.render(<AppRouter />, document.getElementById('root'))
