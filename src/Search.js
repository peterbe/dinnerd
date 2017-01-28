import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { DisplayDay } from './Day'
import store from './Store'


const Search = observer(class Search extends Component {

  constructor() {
    super()
    this.state = {
      search: '',
      searching: false,
      searchResults: null,
    }
    // this.saveChanges = this.saveChanges.bind(this)
    // this.autoCompleteSearch = this.autoCompleteSearch.bind(this)
    // this.toggleEditMode = this.toggleEditMode.bind(this)
    // this.inputBlurred = this.inputBlurred.bind(this)
    // this.inputFocused = this.inputFocused.bind(this)
  }

  // componentDidMount() {
  //   console.log('Search has been mounted', this.props.favorites);
  //   const favorites = this.props.favorites || false
  //   if (favorites) {
  //     // make a first search
  //     this.setState({searching: true})
  //     this.props.getFavorites().then(results => {
  //       let searchResults = []
  //       let texts = {} // XXX Change to use Set
  //       results.forEach(result => {
  //         if (!texts[result.text]) {
  //           texts[result.text] = 1
  //           // searchResults.push({
  //             throw new Error('work harder')
  //           // })
  //         }
  //       })
  //       this.setState({searchResults: searchResults, earching: false})
  //     })
  //   }
  // }

  render() {

    const favorites = this.props.favorites || false
    console.log('Favorites:', store.recentFavorites.length);

    return (
      <div className="search" style={{marginTop: 40}}>
        <h3>{ favorites ? 'Favorites' : 'Search' }</h3>
        <form onSubmit={e => {
          e.preventDefault()
          console.log('Form submitted!');
        }}>
          <input
            type="search"
            className="form-control"
            onChange={e => {
              this.setState({search: e.target.value}, () => {
                if (!this.state.searching && this.state.search.length > 2) {
                  // this.startSearchTimer = window.setTimeout(() => {
                    this.setState({searching: true})
                    this.props.searcher(this.state.search, {
                      fields: {
                        text: {boost: 3},
                        notes: {boost: 1},
                      },
                      bool: 'OR',
                      expand: true
                    }).then(results => {
                      // XXX need to filter this on unique texts (and notes?)
                      console.log("Autocomplete search results:", results);
                      this.setState({searchResults: results, searching: false})
                    })
                }
              })
            }}
            value={this.state.search}/>
            {' '}
            <button
              style={{marginTop: 4}}
              type="submit"
              className="btn btn-success btn-block"
              >
              Search
            </button>
        </form>

        { this.state.searching ? <i>Searching...</i> : null }

        {
          !this.state.searching && this.state.searchResults ?
          <ShowSearchResults
            results={this.state.searchResults}
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
          { favorites ? 'Close Favorites' : 'Close Search' }
        </button>
      </div>
    )
  }
})

export default Search


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
