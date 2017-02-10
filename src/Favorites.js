import React, { Component } from 'react'
import { observer } from 'mobx-react'
import dateFns from 'date-fns'

import { DisplayDay } from './Day'
import store from './Store'


const Favorites = observer(class Favorites extends Component {

  render() {

    // console.log('Rendering Favorites, store.recentFavorites:', store.recentFavorites);

    return (
      <div className="search" style={{marginTop: 40}}>
        <h4>
          Favorites
          {' '}
          <small className="text-muted">(most recent first)</small>
        </h4>
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
          type="button"
          className="btn btn-primary btn-block close-button"
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
                  starred={false}
                  fieldClicked={e => {
                    // nothing
                  }}
                />
                <p className="last-used">
                  Last used { dateFns.format(result.datetime, 'D MMM') },
                  {' '}
                  { dateFns.distanceInWordsStrict(
                    new Date(), result.datetime, {addSuffix: true}
                  ) }
                </p>
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
