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

        <form style={{marginTop: 40}}>
          <p>
            During development it can happen that the local cache
            optimizations get stuck and causes confusion.<br/>
            Pressing this button is harmless but will cause a full reload.
          </p>
          <button
            type="button"
            className="btn btn-danger btn-block"
            onClick={this.props.onClearCache}
            >
            Clear Cache
          </button>
        </form>


        <button
          type="button"
          className="btn btn-primary btn-block close-button"
          onClick={this.props.onClosePage}
          >
          Close Settings
        </button>
      </div>
    )
  }
})

export default Settings
