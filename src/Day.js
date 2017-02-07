import React, { Component } from 'react'
import Highlighter from 'react-highlight-words'
import dateFns from 'date-fns'
import { observer } from 'mobx-react'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import zenscroll from 'zenscroll'

import {
  makeDayId,
  makeWeekId,
  Heart,
  ShowWeekHeaderDates,
  debounce,
 } from './Common'
import store from './Store'


const Day = observer(class Day extends Component {

  constructor() {
    super()
    this.state = {
      edit: false,
      saving: false,
      text: '',
      notes: '',
      starred: false,
      searchResults: {},
    }
    this.saveChanges = this.saveChanges.bind(this)
    this.autoCompleteSearch = debounce(this.autoCompleteSearch.bind(this), 300)
    // this.toggleEditMode = this.toggleEditMode.bind(this)
    this.inputBlurred = this.inputBlurred.bind(this)
    this.inputFocused = this.inputFocused.bind(this)
  }

  componentDidMount() {
    let { day } = this.props
    // console.log('this.props.DAY?', day.date, 'Text?', day.text);
    this.setState({
      text: day.text,
      notes: day.notes,
      starred: day.starred,
      saved: true,
      hadText: false,
      saving: false,
      // searchResults: [],
    })
  }

  // toggleEditMode() {
  //   this.setState({edit: !this.state.edit})
  // }

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
    }, 300)
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
    let searchResults = {}
    const searchConfig = {
      fields: {
        text: field === 'text' ? 1 : 0,
        notes: field === 'notes' ? 1 : 0,
      },
      // Important otherwise the suggestions won't go away when
      // start typing a lot more.
      bool: 'AND',
      expand: true,
    }
    const results = this.props.searcher(text, searchConfig)
    let filteredResults = []
    results.forEach(r => {
      if (r.date !== this.props.day.date) {
        filteredResults.push(r)
      }
    })
    searchResults[field] = filteredResults
    this.setState({searchResults: searchResults})
  }

  startEdit(focusOn = 'text') {
    const { day } = this.props
    // const hadText =
    this.setState({
      text: day.text,
      notes: day.notes,
      starred: day.starred,
      edit: true,
      hadText: !!this.state.text,
    }, () => {
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
                  if (this.closeEditSoon) {
                    window.clearTimeout(this.closeEditSoon)
                  }
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
                  if (this.closeEditSoon) {
                    window.clearTimeout(this.closeEditSoon)
                  }
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
                !this.state.saved || this.state.saving ?
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={this.state.saving}
                  onClick={e => {
                    this.saveChanges()
                    // If there was focus on any inputs, and you press a
                    // button like that, that input triggers its onBlur,
                    // so we want to prevent that from happening.
                    if (this.closeEditSoon) {
                      window.clearTimeout(this.closeEditSoon)
                    }
                    this.setState({saving: true})
                    setTimeout(() => {
                      this.setState({edit: false, saving: false})
                    }, 1000)
                  }}
                  >{ this.state.saving ? 'Saving' : 'Save'}</button>
                  : null
              }
              {' '}
              <button
                type="button"
                className="btn btn-info btn-sm"
                onClick={e => {
                  this.setState({edit: false})
                }}
                >Close</button>
              {' '}
              {
                this.state.text && this.state.hadText ?
                <button
                  type="button"
                  className="btn btn-info btn-sm"
                  onClick={e => {
                    store.copied = {
                      date: day.date,
                      text: this.state.text,
                      notes: this.state.notes,
                      starred: this.state.starred
                    }
                    setTimeout(() => {
                      this.setState({edit: false})
                    }, 1000)
                  }}
                  >
                  {
                    store.copied && store.copied.date === day.date ?
                    'Copied': 'Copy'
                  }

                </button>
                : null
              }
              {' '}
              {
                store.copied && store.copied.date !== day.date && store.copied.text !== this.state.text ?
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  onClick={e => {
                    this.setState({
                      text: store.copied.text,
                      notes: store.copied.notes,
                      starred: store.copied.starred,
                      saved: false,
                    })
                    // If there was focus on any inputs, and you press a
                    // button like that, that input triggers its onBlur,
                    // so we want to prevent that from happening.
                    if (this.closeEditSoon) {
                      window.clearTimeout(this.closeEditSoon)
                    }
                    // this.saveChanges()
                  }}>
                  Paste
                </button>
                : null
              }
            </div>
          </div>
        </div>
      )
    } else {
      // Regular display mode
      display = <DisplayDay
        text={day.text}
        notes={day.notes}
        starred={day.starred}
        fieldClicked={field => {
          this.startEdit(field)
        }}/>
    }

    return (
      <ReactCSSTransitionGroup
            transitionName="fadein"
            transitionAppear={true}
            transitionAppearTimeout={300}
            transitionEnter={false}
            transitionLeave={false}>
        <div className="day" id={makeDayId(day.datetime)}>
          { firstDateThisWeek ? <ShowWeekHeader datetime={day.datetime}/> : null }
          <h5 className="weekday-head">
            {dateFns.format(day.datetime, 'dddd')}
            {' '}
            <ShowWeekdayHeadDate datetime={day.datetime}/>
          </h5>
          { display }
        </div>
      </ReactCSSTransitionGroup>
    )
  }
})

export default Day


const ShowWeekdayHeadDate = ({ datetime }) => {
  const now = new Date()
  let text
  if (dateFns.isToday(datetime)) {
    text = 'Today'
  } else if (dateFns.isYesterday(datetime)) {
    text = 'Yesterday'
  } else if (dateFns.isTomorrow(datetime)) {
    text = 'Tomorrow'
  } else {
    text = dateFns.distanceInWordsStrict(
      dateFns.startOfDay(now),
      datetime,
      {addSuffix: true}
    )

  }

  return (
    <span className="weekday-head-date">
      { text }
    </span>
  )

}

export const DisplayDay = ({ text, notes, starred, fieldClicked }) => {
  return (
    <div className="display-day">
      {
        !text.trim() && !notes.trim() ?
        <p onClick={e => fieldClicked('text')}><i>empty</i></p>
        : null
      }
      <p
        className="text"
        onClick={e => fieldClicked('text')}>
        { text }
        { starred ?
          <Heart
            size={16}
            filled={starred}
            bubble={e => {}}
          /> : null
        }
      </p>
      <p
        className="notes"
        onClick={e => fieldClicked('notes')}>
        { notes }
      </p>
    </div>
  )
}

const ShowWeekHeader = ({ datetime }) => {
  const id = makeWeekId(datetime)
  return (
    <h3 className="week-head" id={id} onClick={e => {
      const id = makeDayId(datetime)
      const element = document.querySelector('#' + id)
      zenscroll.to(element)
    }}>
      <ShowWeekHeaderDates
        start={datetime}
        end={dateFns.addDays(datetime, 6)}/>
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
