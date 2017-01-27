import React, { Component } from 'react'
import { observer } from 'mobx-react'

import store from './Store'


const Settings = observer(class Settings extends Component {

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
                checked={store.settings.weekStartsOnAMonday}
                onChange={e => {
                  store.setSetting('weekStartsOnAMonday', e.target.checked)
                  this.props.onChangeWeekStart()
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
})

export default Settings
