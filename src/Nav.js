import React, { Component } from 'react'
import dateFns from 'date-fns'
import { observer } from 'mobx-react'

import store from './Store'
import { makeDayId, ShowWeekHeaderDates } from './Common'

const Nav = observer(class Nav extends Component {
  constructor() {
    super()
    this.state = {
      collapsed: true,
      collapsing: false,
    }
  }
  render() {
    let burgerClassname = 'navbar-toggler navbar-toggler-right'
    let navlinksClassname = 'navbar-collapse'
    if (this.state.collapsing) {
      navlinksClassname += ' collapsing'
    } else if (this.state.collapsed) {
      navlinksClassname += ' collapse '
    } else {
      navlinksClassname += ' collapse show'
    }

    return (
      <nav className="navbar fixed-top navbar-light bg-faded">
        <button
          className={burgerClassname}
          type="button"
          data-toggle="collapse"
          data-target="#navbarText"
          aria-controls="navbarText"
          aria-expanded="false"
          aria-label="Toggle navigation"
          onClick={e => {
            this.setState({collapsing: true})
            window.setTimeout(() => {
              this.setState({collapsing: false, collapsed: !this.state.collapsed})
            }, 200)
          }}>
          <img
            src={process.env.PUBLIC_URL + '/static/burger.svg'}
            width="30" height="30" className="d-inline-block align-top" alt=""/>
        </button>
        <a
          className="navbar-brand" href="/"
          onClick={e => {
            e.preventDefault()
            const id = makeDayId(store.firstDateThisWeek)
            document.querySelector('#' + id).scrollIntoView()
          }}>
          Dinnerd
          {' '}
          {
            store.firstDateThisWeek ?
            <ShowWeekHeaderDates
              start={store.firstDateThisWeek}
              end={dateFns.addDays(store.firstDateThisWeek, 6)}
            /> :
            null
          }
        </a>
        <div className={navlinksClassname} id="navbarNav">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={e => {
                  e.preventDefault()
                  // console.log('GO TO', store.firstDateThisWeek);
                  const id = makeDayId(store.firstDateThisWeek)
                  document.querySelector('#' + id).scrollIntoView()
                  this.setState({collasing: false, collapsed: true})
                }}
                >Go to <i>this</i> week</a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={e => {
                  e.preventDefault()
                  this.props.onGotoSettings()
                  this.setState({collapsed: true})
                }}
                >Settings</a>
            </li>
          </ul>
        </div>
      </nav>
    )
  }
})

export default Nav
