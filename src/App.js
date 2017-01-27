import React, { Component } from 'react'
import dateFns from 'date-fns'

import './App.css'
import Nav from './Nav'
import Days from './Days'
import Settings, { settings } from './Settings'

class App extends Component {
  constructor() {
    super()
    this.state = {
      show: 'days',
    }
  }

  // XXX perhaps move the creation of the lovefield db here
  // If you load the Settings page, then page to the days page,
  // it doesn't have to re-load everything.

  componentWillMount() {
    let weekStartsOnAMonday = settings.weekStartsOnAMonday

    // perhaps move this to the render function XXX
    // that way if you keep the app loaded for days without
    // refreshing it'll be stuck. But a render() is easy to trigger.
    this.firstDateThisWeek = dateFns.startOfWeek(
      new Date(), {weekStartsOn: weekStartsOnAMonday ? 1 : 0}
    )
  }

  render() {

    let page = <p>Loading...</p>
    if (this.state.show === 'days') {
      page = <Days
        firstDateThisWeek={this.firstDateThisWeek}
      />
    } else if (this.state.show === 'settings') {
      page = <Settings
        closeSettings={e => {
          this.setState({show: 'days'})
        }}/>
    }
    return (
      <div className="container">
        <Nav
          firstDateThisWeek={this.firstDateThisWeek}
          onGotoSettings={() => {
            this.setState({show: 'settings'})
          }}

        />
        <div className="App-header">
          <h2>Hi! Waldo here!</h2>
        </div>
        { page }
      </div>
    );
  }
}

export default App
