import React, { Component } from 'react'


class Defaults {
  constructor() {
    this.weekStartsOnAMonday = JSON.parse(
      localStorage.getItem('weekStartsOnAMonday') || 'false'
    )
  }
}

export const settings = new Defaults()
console.log('settings', settings);


export default class Settings extends Component {
  constructor() {
    super()
    this.state = {
      weekStartsOnAMonday: settings.weekStartsOnAMonday,
    }
    // this.updateDay = this.updateDay.bind(this)
    // this.searcher = this.searcher.bind(this)
    // this.loadPreviousWeek = this.loadPreviousWeek.bind(this)
    // this.loadNextWeek = this.loadNextWeek.bind(this)
  }

  render() {
    return (
      <div className="settings" style={{marginTop: 40}}>
        <h2>Settings</h2>
        <form>
          <div className="form-check">
            <label className="form-check-label">
              <input
                type="checkbox"
                className="form-check-input form-control-lg"
                checked={this.state.weekStartsOnAMonday}
                onChange={e => {
                  settings.weekStartsOnAMonday = e.target.checked
                  localStorage.setItem(
                    'weekStartsOnAMonday',
                    JSON.stringify(e.target.checked)
                  )
                  this.setState({weekStartsOnAMonday: e.target.checked})
                }}/>
              <b>Week starts on a Monday?</b>
            </label>
          </div>
        </form>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={this.props.closeSettings}
          >
          Close Settings
        </button>
      </div>
    )
  }

}
