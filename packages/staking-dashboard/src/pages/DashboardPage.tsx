import React from 'react'
import Form from '../components/Form'
import Header from '../layout/Header'

interface IDashboardPageProps {
  doNetworkConnect: () => void
  isMobileMedia: boolean
}

export function DashboardPage(props: IDashboardPageProps) {
  return (
    <section className="pb-50">
      <Header isMobileMedia={props.isMobileMedia} doNetworkConnect={props.doNetworkConnect} />
      <Form />
    </section>
  )
}

export default React.memo(DashboardPage)
