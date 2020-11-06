import React, { PureComponent } from 'react'
import HeaderMenuItem, { IHeaderMenuItemProps } from './HeaderMenuItem'

export interface IHeaderMenuProps {}

const itemsMenu = [
  { id: 1, title: 'Dashboard', link: '/', external: false }
  // { id: 2, title: "Transactions", link: "/transactions", external: false }
]

export default class HeaderMenu extends PureComponent<IHeaderMenuProps> {
  public render() {
    const menuItems = itemsMenu.map((item: IHeaderMenuItemProps) => (
      <HeaderMenuItem key={item.id} {...item} />
    ))
    return <div className="header-menu">{menuItems}</div>
  }
}
