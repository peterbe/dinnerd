import React, { Component } from 'react'
import Highlighter from 'react-highlight-words'
import dateFns from 'date-fns'

import { makeDayId, makeWeekId, Heart } from './Common'


export default class Day extends Component {

  constructor() {
    super()
    this.state = {
      edit: false,
      text: '',
      notes: '',
      starred: false,
      searchResults: {},
    }
    this.saveChanges = this.saveChanges.bind(this)
    this.autoCompleteSearch = this.autoCompleteSearch.bind(this)
    this.toggleEditMode = this.toggleEditMode.bind(this)
    this.inputBlurred = this.inputBlurred.bind(this)
    this.inputFocused = this.inputFocused.bind(this)
  }

  componentDidMount() {
    let { day } = this.props
    this.setState({
      text: day.text,
      notes: day.notes,
      starred: day.starred,
      saved: true,
      // searchResults: [],
    })
  }

  toggleEditMode() {
    this.setState({edit: !this.state.edit})
  }

  saveChanges() {
    this.props.updateDay(this.props.day, {
      text: this.state.text.trim(),
      notes: this.state.notes.trim(),
      starred: this.state.starred,
    }).then(r => {
      this.setState({
        text: this.state.text.trim(),
        notes: this.state.notes.trim(),
        saved: true,
        searchResults: {},
      })
    })
  }

  inputBlurred(event) {
    this.closeEditSoon = window.setTimeout(() => {
      this.setState({edit: false})
    }, 400)
  }

  inputFocused(event) {
    if (event.target.setSelectionRange) {
      const inputLength = event.target.value.length
      event.target.setSelectionRange(inputLength, inputLength)
    }
    if (this.closeEditSoon) {
      window.clearTimeout(this.closeEditSoon)
    }
  }

  autoCompleteSearch(text, field) {
    if (text.length < 2) {
      if (this.state.searchResults[field]) {
        this.setState({searchResults: {}})
      }
      return
    }
    const { searcher } = this.props
    let searchResults = {}
    searcher(text, field).then(results => {
      searchResults[field] = results

      this.setState({searchResults: searchResults})
    })
  }

  startEdit(focusOn = 'text') {
    this.setState({edit: true}, () => {
      const parentElement = document.querySelector(
        '#' + makeDayId(this.props.day.datetime)
      )
      if (parentElement) {
        const element = parentElement.querySelector(
          `textarea.${focusOn}`
        )
        if (element) {
          element.focus()
        }
      }
    })
  }

  render() {
    let { day, firstDateThisWeek } = this.props
    let display
    if (this.state.edit) {
      display = (
        <div className="container">
          <form onSubmit={e => {
            // This will probably never trigger unless textareas are replaced with inputs
            e.preventDefault()
            console.log("FOrm submitted!");
          }}>
          <div className="textareas">
            <div className="textarea">
              <textarea
                className="text form-control"
                placeholder="Text..."
                onBlur={this.inputBlurred}
                onFocus={this.inputFocused}
                onChange={e => {
                  this.setState({text: e.target.value, saved: false}, () => {
                    this.autoCompleteSearch(this.state.text, 'text')
                  })
                }}
                value={this.state.text}></textarea>
              <ShowTextAutocomplete
                text={this.state.text}
                field="text"
                results={this.state.searchResults.text}
                picked={text => {
                  this.setState({text: text, saved: false, searchResults: {}})
                }}
              />

            </div>
            <div className="textarea">
              <textarea
                className="notes form-control"
                placeholder="Notes..."
                onBlur={this.inputBlurred}
                onFocus={this.inputFocused}
                onChange={e => {
                  this.setState({notes: e.target.value, saved: false}, () => {
                    this.autoCompleteSearch(this.state.notes, 'notes')
                  })
                }}
                value={this.state.notes}></textarea>
              <ShowTextAutocomplete
                text={this.state.notes}
                results={this.state.searchResults.notes}
                field="notes"
                picked={text => {
                  this.setState({notes: text, saved: false, searchResults: {}})
                }}
              />
            </div>

          </div>
          </form>
          <div className="actions row">
            <div className="action starred col-4">
              <Heart
                filled={this.state.starred}
                bubble={e => {
                  this.setState({starred: !this.state.starred}, this.saveChanges)
                }}
              />
            </div>
            <div className="action buttons col-8">
              {
                !this.state.saved ?
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={this.saveChanges}
                  >Save</button>
                  : null
              }
              {' '}
              <button
                type="button"
                className="btn btn-info"
                onClick={e => {
                  this.setState({edit: false})
                }}
                >Close</button>
            </div>
          </div>
        </div>
      )
    } else {
      // Regular display mode
      display = (
        <div>
          {
            !this.state.text.trim() && !this.state.notes.trim() ?
            <p onClick={e => this.startEdit('text')}><i>empty</i></p>
            : null
          }
          <p
            className="text"
            onClick={e => this.startEdit('text')}>
            { this.state.text }
            { this.state.starred ?
              <Heart
                size={16}
                filled={this.state.starred}
                bubble={e => {}}
              /> : null
            }
          </p>
          <p
            className="notes"
            onClick={e => this.startEdit('notes')}>
            { this.state.notes }
          </p>
        </div>
      )
    }

    return (
      <div className="day" id={makeDayId(day.datetime)}>
        { firstDateThisWeek ? <ShowWeekHeader datetime={day.datetime}/> : null }
        <h5 className="weekday-head">
          {dateFns.format(day.datetime, 'dddd')}
          {' '}
          <span className="weekday-head-date">
            {dateFns.format(day.datetime, 'Do MMM')}
          </span>
        </h5>
        { display }
      </div>
    )
  }
}


const ShowWeekHeader = ({ datetime }) => {
  let lastDatetime = dateFns.addDays(datetime, 6)
  const id = makeWeekId(datetime)
  return (
    <h3 className="week-head" id={id} onClick={e => {
      const id = makeDayId(datetime)
      document.querySelector('#' + id).scrollIntoView()
    }}>
      { dateFns.format(datetime, 'D MMM') }
      {' '}
      ...
      {' '}
      { dateFns.format(lastDatetime, 'D MMM') }
    </h3>
  )
}


const ShowTextAutocomplete = ({ text, results, picked, field = 'text' }) => {
  if (!results) {
    return null
  }
  if (!results.length) {
    return null
  }
  if (!text.trim()) {
    return null
  }
  const searchWords = text.match(/\b(\w+)\b/g).map(word => {
    // return '\b' + word
    return word
  })
  return (
    <div className="autocomplete">
      <ul>
        {
          results.map(result => {
            return (
              <li
                key={result.date}
                onClick={e => picked(result[field])}
                >
                <Highlighter
                  highlightClassName='YourHighlightClass'
                  searchWords={searchWords}
                  textToHighlight={result[field]}
                />
              </li>
            )
          })
        }
      </ul>
    </div>
  )
}
