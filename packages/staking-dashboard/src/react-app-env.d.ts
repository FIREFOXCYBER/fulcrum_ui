/// <reference types="react-scripts" />
declare module 'react-tippy'
declare module 'node-fetch'
declare module 'react-intercom'
declare module '3box'

declare namespace NodeJS {
  export interface ProcessEnv {
    REACT_APP_ETH_NETWORK: ('mainnet'|'kovan'|'rinkeby'|'ropsten'|undefined);
  }
}
