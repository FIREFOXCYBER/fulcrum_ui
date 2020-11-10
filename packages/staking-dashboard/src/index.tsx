import React from 'react'
import ReactDOM from 'react-dom'
import TagManager from 'react-gtm-module'
import AppRouter from './components/AppRouter'
import appConfig from './config/appConfig'
import configProviders from './config/providers.json'

import './styles/index.scss'

if (appConfig.isMainnetProd) {
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
