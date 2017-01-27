import React, { Component } from 'react'
import './App.css'
import dateFns from 'date-fns'
import Highlighter from 'react-highlight-words'
import lf from 'lovefield'
import elasticlunr from 'elasticlunr'
import getSchema from './Schema'
// import JsSearch from 'js-search'


const DATE_FORMAT = 'YYYY-MM-DD'


const makeWeekId = (datetime) => {
  return 'week-head-' + dateFns.format(datetime, 'YYYYW')
}

const makeDayId = (datetime) => {
  return 'day-' + dateFns.format(datetime, 'YYYYMMDD')
}

class App extends Component {
  constructor() {
    super()
    this.state = {
      days: [],
    }
    this.updateDay = this.updateDay.bind(this)
    this.searcher = this.searcher.bind(this)
    this.loadPreviousWeek = this.loadPreviousWeek.bind(this)
    this.loadNextWeek = this.loadNextWeek.bind(this)
  }

  componentWillMount() {
    this.schemaBuilder = getSchema()
  }

  componentDidMount() {
    this.weekStartsOnAMonday = JSON.parse(
      localStorage.getItem('weekStartsOnAMonday') || 'false'
    )
    this.firstDateThisWeek = dateFns.startOfWeek(
      new Date(), {weekStartsOn: this.weekStartsOnAMonday ? 1 : 0}
    )

    this.createDBConnection().then(() => {

      // this.searchIndex = new JsSearch.Search('days')
      // this.searchIndex.addIndex('text')
      // this.searchIndex.addIndex('notes')
      // this.searchIndex.addIndex('date')

      // Set up the searchIndex before calling loadWeek() for the first time
      this.searchIndex = elasticlunr(function () {
        this.addField('text')
        this.addField('notes')
        // this.addField('starred')
        // this.addField('datetime')
        this.setRef('date')

        // not store the original JSON document to reduce the index size
        this.saveDocument(false)
        // this.saveDocument(true)  // XXX right?
      })

      this.loadWeek(this.firstDateThisWeek).then(() => {
        // Populate the index with ALL days
        const searchIndexAsJson = localStorage.getItem('searchIndex')
        if (searchIndexAsJson) {
          // override this.searchIndex
          this.searchIndex = elasticlunr.Index.load(
            JSON.parse(searchIndexAsJson)
          )
        } else {
          this.populateWholeIndex()
        }
      })
    })

  }

  createDBConnection() {
    return this.schemaBuilder.connect().then(db => {
      this.db = db
    })
  }

  populateWholeIndex() {
    let searchIndexAsJson = localStorage.getItem('searchIndex')
    console.log('searchIndexAsJson', searchIndexAsJson);
    if (searchIndexAsJson) {

    } else {
      const daysTable = this.db.getSchema().table('Days');
      return this.db.select().from(daysTable)
      .exec().then(results => {
        results.forEach(result => {
          this.searchIndex.addDoc({
            date: result.date,
            text: result.text,
            notes: result.notes,
          })
        })
        localStorage.setItem('searchIndex', JSON.stringify(this.searchIndex))
      })
    }
  }

  loadWeek(firstDate) {
    let lastDate = dateFns.addDays(firstDate, 7)
    const daysTable = this.db.getSchema().table('Days');
    return this.db.select().from(daysTable)
    .where(
      lf.op.and(
        daysTable.datetime.gte(firstDate),
        daysTable.datetime.lt(lastDate)
      )
    )
    .exec().then(results => {
      let daysMap = {}
      results.forEach(day => {
        daysMap[day.date] = day
      })
      let days = this.state.days
      let dayNumbers = [0, 1, 3, 4, 5, 6]
      dayNumbers.forEach(d => {
        let datetime = dateFns.addDays(firstDate, d)
        let date = dateFns.format(datetime, DATE_FORMAT)
        // let indexDocuments = []
        if (daysMap[date]) {
          days.push(daysMap[date])
          // indexDocuments.push({
          //   date: daysMap[date].date,
          //   text: daysMap[date].text,
          //   notes: daysMap[date].notes,
          // })
          // this.searchIndex.addDoc({
          //   date: date,
          //   datetime: daysMap[date].datetime,
          //   text: daysMap[date].text,
          //   notes: daysMap[date].notes,
          //   starred: daysMap[date].starred,
          // })
        } else {
          days.push({
            date: date,
            datetime: datetime,
            text: '',
            notes: '',
            starred: false,
          })
        }
        // if (indexDocuments.length) {
        //   this.searchIndex.addDocuments(indexDocuments)
        // }
      })
      // days.sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
      days.sort((a, b) => a.datetime - b.datetime)
      this.setState({days: days})
    })
  }

  updateDay(day, data) {
    const daysTable = this.db.getSchema().table('Days')
    let row = daysTable.createRow({
      date: day.date,
      datetime: day.datetime,
      text: data.text,
      notes: data.notes,
      starred: data.starred,
    })
    return this.db.insertOrReplace().into(daysTable).values([row]).exec()
    .then(inserted => {
      // console.log('INSERTED', inserted);
      inserted.forEach(day => {
        this.searchIndex.addDoc({
          date: day.date,
          datetime: day.datetime,
          text: day.text,
          notes: day.notes,
          starred: day.starred,
        })
        // this.searchIndex.addDocuments([{
        //   date: day.date,
        //   text: day.text,
        //   notes: day.notes,
        // }])
      })
      return inserted
    })
    //
    // let rows = this.state.days

  }

  searcher(text, field) {
    if (!(field === 'text' || field === 'notes')) {
      throw new Error(`Unrecognized field ${field}`)
    }
    let found = this.searchIndex.search(
      text,
      {
        fields: {
          text: field === 'text' ? 1 : 0,
          notes: field === 'notes' ? 1 : 0,
        },
        // Important otherwise the suggestions won't go away when
        // start typing a lot more.
        bool: 'AND',
        expand: true,
      },
    )
    if (!found.length) {
      return Promise.resolve([])
    }
    if (!this._searchCache) {
      this._searchCache = {}  // XXX should perhaps be a capped cache object
    }
    let refs = {}
    let cached = []
    found.forEach(f => {
      refs[f.ref] = f.score
      if (this._searchCache[f.ref]) {
        cached.push(this._searchCache[f.ref])
      }
    })
    if (found.length === cached.length) {
      // we had all of them cached!
      console.log('hit lookup fully cached');
      return Promise.resolve(cached)
    }
    const daysTable = this.db.getSchema().table('Days')
    return this.db.select().from(daysTable)
    .where(
      daysTable.date.in(Object.keys(refs))
    )
    .exec().then(results => {
      results.forEach(result => {
        this._searchCache[result.date] = result
      })
      results.sort((a, b) => {
        return refs[b.date] - refs[a.date]
      })
      return results
    })
  }

  loadPreviousWeek(event) {
    const firstDatetime = this.state.days[0].datetime
    const firstDatePreviousWeek = dateFns.subDays(firstDatetime, 7)
    this.loadWeek(firstDatePreviousWeek).then(() => {
      const element = document.querySelector(
        '#' + makeWeekId(firstDatePreviousWeek)
      )
      if (element) {
        element.scrollIntoView({block: 'start', behavior: 'smooth'})
      }
    })
  }

  loadNextWeek(event) {
    const lastDatetime = this.state.days[this.state.days.length - 1].datetime
    // console.log('lastDatetime', lastDatetime);
    const firstDateNextWeek = dateFns.addDays(lastDatetime, 1)
    this.loadWeek(firstDateNextWeek).then(() => {
      const element = document.querySelector(
        '#' + makeWeekId(firstDateNextWeek)
      )
      if (element) {
        element.scrollIntoView({block: 'start', behavior: 'smooth'})
      }
    })
  }

  render() {
    const weekStartsOn = this.weekStartsOnAMonday ? 1 : 0
    return (
      <div className="container">
        <Nav firstDateThisWeek={this.firstDateThisWeek}/>
        <div className="App-header">
          <h2>Hi! Waldo here!</h2>
        </div>
        {
          this.state.days.length ?
          <div className="options top">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={this.loadPreviousWeek}>
              Previous week
            </button>
          </div>
          : null
        }

        { !this.state.days.length ? <i>Loadings...</i> : null }
        {
          this.state.days.map(day => {
            let firstDateThisWeek = dateFns.isEqual(
              day.datetime,
              dateFns.startOfWeek(day.datetime, {weekStartsOn: weekStartsOn})
            )
            return <Day
              day={day}
              key={day.date}
              updateDay={this.updateDay}
              searcher={this.searcher}
              firstDateThisWeek={firstDateThisWeek}
            />
          })
        }
        {
          this.state.days.length ?
          <div className="options bottom">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={this.loadNextWeek}>
              Next week
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={e => {
                // might need to make sure all days are NOT in edit mode
                window.print()
              }}>
              Print
            </button>
          </div>
          : null
        }
      </div>
    );
  }
}

export default App


class Nav extends Component {
  constructor() {
    super()
    this.state = {
      collapsed: true,
      collapsing: false,
    }
    // this.saveChanges = this.saveChanges.bind(this)
    // this.autoCompleteSearch = this.autoCompleteSearch.bind(this)
    // this.toggleEditMode = this.toggleEditMode.bind(this)
    // this.inputBlurred = this.inputBlurred.bind(this)
    // this.inputFocused = this.inputFocused.bind(this)
  }
  render() {
    let burgerClassname = 'navbar-toggler navbar-toggler-right'
    let navlinksClassname = 'navbar-collapse'
    if (this.state.collapsing) {
      navlinksClassname += ' collapsing'
    } else if (this.state.collapsed) {
      navlinksClassname += ' collapse '
    } else {
      navlinksClassname += ' collapse show'
    }
    return (
      <nav className="navbar fixed-top navbar-light bg-faded">
        <button
          className={burgerClassname}
          type="button"
          data-toggle="collapse"
          data-target="#navbarText"
          aria-controls="navbarText"
          aria-expanded="false"
          aria-label="Toggle navigation"
          onClick={e => {
            this.setState({collapsing: true})
            window.setTimeout(() => {
              this.setState({collapsing: false, collapsed: !this.state.collapsed})
            }, 200)
          }}>
          <img
            src={process.env.PUBLIC_URL + '/static/burger.svg'}
            width="30" height="30" className="d-inline-block align-top" alt=""/>
        </button>
        <a
          className="navbar-brand" href="/"
          onClick={e => {
            e.preventDefault()
            const id = makeDayId(this.props.firstDateThisWeek)
            document.querySelector('#' + id).scrollIntoView()
          }}>
          {/* <img
            src={process.env.PUBLIC_URL + '/static/burger.svg'}
            width="30" height="30" className="d-inline-block align-top" alt=""/> */}
          Dinnerd
        </a>
        <div className={navlinksClassname} id="navbarNav">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={e => {
                  e.preventDefault()
                  const id = makeDayId(this.props.firstDateThisWeek)
                  document.querySelector('#' + id).scrollIntoView()
                  this.setState({collasing: false, collapsed: true})
                }}
                >Go to <i>this</i> week</a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="#"
                onClick={e => {
                  e.preventDefault()
                  console.log('Tell parent to load Settings view');
                }}
                >Settings</a>
            </li>
            {/* <li className="nav-item">
              <a className="nav-link disabled" href="#">Disabled</a>
            </li> */}
          </ul>
        </div>
        {/* <span class="navbar-text">Text</span> */}
        {/* <button className="btn btn-outline-success my-2 my-sm-0" type="submit">Search</button> */}
      </nav>
    )
  }
}

class Day extends Component {

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

const Heart = ({ filled, bubble }) => {
  return (
    <svg height="24" version="1.1" width="24" onClick={bubble}>
      <g transform="translate(0 -1028.4)">
        <path
          d="m7 1031.4c-1.5355 0-3.0784 0.5-4.25 1.7-2.3431 2.4-2.2788 6.1 0 8.5l9.25 9.8 9.25-9.8c2.279-2.4 2.343-6.1 0-8.5-2.343-2.3-6.157-2.3-8.5 0l-0.75 0.8-0.75-0.8c-1.172-1.2-2.7145-1.7-4.25-1.7z"
          fill={filled ? '#c0392b' : '#cccccc' }/>
      </g>
    </svg>
  )
}
