import React, { Component } from 'react'
import { observer } from 'mobx-react'

import { DisplayDay } from './Day'
import { debounce } from './Common'
import store from './Store'


const Search = observer(class Search extends Component {

  constructor() {
    super()
    this.state = {
      search: '',
      searching: false,
      searchResults: null,
    }
    this.autoCompleteSearch = debounce(this.autoCompleteSearch.bind(this), 300)
  }

  autoCompleteSearch() {
    if (!this.state.search.trim().length) {
      this.setState({
        searchResults: [],
        searching: false,
      })
    }
    this.setState({searching: true})
    this.props.searcher(this.state.search, {
      fields: {
        text: {boost: 3},
        notes: {boost: 1},
      },
      bool: 'OR',
      expand: true,
    }).then(results => {
      let hashes = new Set()
      let searchResults = []
      results.forEach(result => {
        let hash = result.text + result.notes
        if (!hashes.has(hash) && searchResults.length < 50) {
          searchResults.push(result)
          hashes.add(hash)
        }
      })
      this.setState({
        searchResults: searchResults,
        searching: false,
      })
    })
  }

  render() {

    return (
      <div className="search" style={{marginTop: 40}}>
        <h3>Search</h3>
        <form onSubmit={e => {
          e.preventDefault()
          console.log('Form submitted!');
        }}>
          <input
            type="search"
            className="form-control"
            onChange={e => {
              this.setState({search: e.target.value}, this.autoCompleteSearch)
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
          !this.state.searching && this.state.searchResults && !this.state.searchResults.length ?
          <p>Nothing found.</p>
          : null
        }

        {
          !this.state.searching && this.state.searchResults && this.state.searchResults.length ?
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
          Close Search
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
