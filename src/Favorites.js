import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { DisplayDay } from './Day'
import store from './Store'


const Favorites = observer(class Favorites extends Component {

  render() {

    return (
      <div className="search" style={{marginTop: 40}}>
        <h3>Favorites</h3>
        { !store.recentFavorites ? <i>Loading...</i> : null }

        {
          store.recentFavorites && !store.recentFavorites.length ?
          <i>No favorites saved. Heart more!</i>
          : null
        }
        {
          store.recentFavorites && store.recentFavorites.length ?
          <ShowSearchResults
            results={store.recentFavorites}
            onClosePage={this.props.onClosePage}
          />
          : null
        }

        <button
          style={{marginTop: 40}}
          type="button"
          className="btn btn-primary btn-block"
          onClick={this.props.onClosePage}
          >
          Close Favorites
        </button>
      </div>
    )
  }
})

export default Favorites


// Consider importing this from Search instead (or Common)
const ShowSearchResults = ({ results, onClosePage }) => {
  return (
    <div className="search-results">
      {
        results.map(result => {
          return (
            <div className="search-result row"
              key={result.date + result.text}>
              <div className="col-9">
                <DisplayDay
                  text={result.text}
                  notes={result.notes}
                  starred={result.starred}
                  fieldClicked={e => {
                    // nothing
                  }}
                />
              </div>
              <div className="col-3 action buttons"
                style={{paddingTop: 5}}>
                <button
                  type="button"
                  className="btn btn-info btn-sm"
                  onClick={e => {
                    store.copied = {
                      date: result.date,
                      text: result.text,
                      notes: result.notes,
                      starred: result.starred,
                    }
                    onClosePage()
                  }}>
                  Copy
                </button>
              </div>
            </div>
          )
        })
      }
    </div>
  )
}
