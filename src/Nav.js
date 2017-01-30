import React, { Component } from 'react'
import dateFns from 'date-fns'
import { observer } from 'mobx-react'

import store from './Store'
import { ShowWeekHeaderDates, Heart } from './Common'

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
          className="navbar-brand" href="#"
          onClick={e => {
            e.preventDefault()
            this.props.onGotoWeek()
            // const id = makeDayId(store.firstDateThisWeek)
            // document.querySelector('#' + id).scrollIntoView()
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
                  // const id = makeDayId(store.firstDateThisWeek)
                  // document.querySelector('#' + id).scrollIntoView()
                  this.setState({collapsing: false, collapsed: true})
                  this.props.onGotoWeek()
                }}
                >Go to <i>this</i> week</a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#page:settings"
                onClick={e => {
                  e.preventDefault()
                  this.setState({collapsed: true})
                  this.props.onGotoSettings()
                }}
                >Settings</a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#page:search"
                onClick={e => {
                  e.preventDefault()
                  this.setState({collapsed: true})
                  this.props.onGotoSearch()
                }}
                >
                  Search
                </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#page:starred"
                onClick={e => {
                  e.preventDefault()
                  this.setState({collapsed: true})
                  this.props.onGotoStarred()
                }}
                >
                  <Heart
                    filled={true}
                    bubble={e => {
                      // this.setState({starred: !this.state.starred}, this.saveChanges)
                    }}
                  />
                  Favorites
                </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={e => {
                  e.preventDefault()
                  window.print()
                  // this.props.onGotoSettings()
                  // this.setState({collapsed: true})
                }}
                >Print</a>
            </li>
          </ul>
        </div>
      </nav>
    )
  }
})

export default Nav
