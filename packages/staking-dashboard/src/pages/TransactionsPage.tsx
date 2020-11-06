import React from 'react'
import TableGrid from '../components/TableGrid'
import Header from '../layout/Header'

interface ITransactionsPageProps {
  doNetworkConnect: () => void
  isMobileMedia: boolean
}

export function TransactionsPage(props: ITransactionsPageProps) {
  return (
    <section>
      <Header isMobileMedia={props.isMobileMedia} doNetworkConnect={props.doNetworkConnect} />
      <div className="container container-sm">
        <h1>Staking Details</h1>
        <TableGrid isMobileMedia={props.isMobileMedia} />

        <h1>Reward Details</h1>
        <TableGrid isMobileMedia={props.isMobileMedia} />
      </div>
    </section>
  )
}

export default React.memo(TransactionsPage)
