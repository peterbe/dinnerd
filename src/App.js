import React, { Component } from 'react'
import logo from './logo.svg'
import './App.css'
import dateFns from 'date-fns'
import Highlighter from 'react-highlight-words'
import getSchema from './Schema'
import JsSearch from 'js-search'


const DATE_FORMAT = 'YYYY-MM-DD'


class App extends Component {
  constructor() {
    super()
    this.state = {
      days: [],
    }
    this.updateDay = this.updateDay.bind(this)
    this.searcher = this.searcher.bind(this)
  }

  componentWillMount() {
    this.schemaBuilder = getSchema()
  }

  componentDidMount() {
    const weekStartsOnAMonday = JSON.parse(
      localStorage.getItem('weekStartsOnAMonday') || 'false'
    )
    const firstDateThisWeek = dateFns.startOfWeek(
      new Date(), {weekStartsOn: weekStartsOnAMonday ? 1 : 0}
    )

    this.createDBConnection().then(() => {
      this.loadWeek(firstDateThisWeek).then(() => {
        console.log('First week loaded');
        this.buildSearchIndex().then(() => {
          console.log('Search Index loaded');
        })
      })
    })

  }

  createDBConnection() {
    return this.schemaBuilder.connect().then(db => {
      this.db = db
    })
  }

  loadWeek(firstDate) {
    const daysTable = this.db.getSchema().table('Days');
    return this.db.select().from(daysTable).exec().then(results => {
      // console.log("RESULTS!", results);
      let daysMap = {}
      results.forEach(day => {
        daysMap[day.date] = day
      })
      let days = this.state.days
      // initiate 7 empty days for this week

      let dayNumbers = [0, 1, 3, 4, 5, 6]
      dayNumbers.forEach(d => {
        let datetime = dateFns.addDays(firstDate, d)
        let date = dateFns.format(datetime, DATE_FORMAT)
        if (daysMap[date]) {
          days.push(daysMap[date])
        } else {
          days.push({
            date: date,
            datetime: datetime,
            text: '',
            notes: '',
            starred: false,
          })
        }
      })
      this.setState({days: days})
    })
  }

  buildSearchIndex() {

    this.searchIndex = new JsSearch.Search('days')
    this.searchIndex.addIndex('text')
    this.searchIndex.addIndex('notes')
    this.searchIndex.addIndex('date')

    const daysTable = this.db.getSchema().table('Days');
    return this.db.select().from(daysTable).exec().then(results => {
      let documents = []
      results.forEach(result => {
        documents.push({
          date: result.date,
          text: result.text,
          notes: result.notes,
        })
      })
      this.searchIndex.addDocuments(documents)

    })
  }

  updateDay(day, data) {
    console.log("SAVE!", "DAY", day, "DATA", data);
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
      console.log('INSERTED', inserted);
      inserted.forEach(day => {
        this.searchIndex.addDocuments([{
          date: day.date,
          text: day.text,
          notes: day.notes,
        }])
      })
      return inserted
    })
    //
    // let rows = this.state.days

  }

  searcher(text) {
    return this.searchIndex.search(text)
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Dinnerd</h2>
        </div>

        {
          this.state.days.length ?
          <ShowWeekHeader datetime={this.state.days[0].datetime}/>
          : <i>thinking...</i>
        }
        {
          this.state.days.map(day => {
            return <Day
              day={day}
              key={day.date}
              updateDay={this.updateDay}
              searcher={this.searcher}
            />
          })
        }
      </div>
    );
  }
}

export default App

const ShowWeekHeader = ({ datetime }) => {
  let lastDatetime = dateFns.addDays(datetime, 6)
  return (
    <h3 className="App-intro">
      { dateFns.format(datetime, 'Do MMMM') }
      {' '}
      ...
      {' '}
      { dateFns.format(lastDatetime, 'Do MMMM') }
    </h3>
  )
}


class Day extends Component {

  constructor() {
    super()
    this.state = {
      text: '',
      notes: '',
      starred: false,
      searchResults: [],
    }
    this.saveChanges = this.saveChanges.bind(this)
    this.autoCompleteSearch = this.autoCompleteSearch.bind(this)
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

  saveChanges(event) {
    // console.log("SEND", this.state.text, this.state.notes, this.state.starred);
    this.props.updateDay(this.props.day, {
      text: this.state.text,
      notes: this.state.notes,
      starred: this.state.starred,
    }).then(r => {
      this.setState({saved: true})
    })
    // Immediately hide the autocomplete whilst waiting for the
    // persistent save to finish.
    this.setState({searchResults: []})
  }

  autoCompleteSearch(text, field) {
    // console.log(this.props);
    const { searcher } = this.props
    // console.log('SEARCHING FOR', text);
    this.setState({searchResults: searcher(text, field)})
  }

  render() {
    let { day } = this.props
    return (
      <div className="day">
        <h3>{dateFns.format(day.datetime, 'dddd')}</h3>
        <div className="textareas">
          <div className="textarea">
            <textarea
              placeholder="Text..."
              onBlur={this.saveChanges}
              onChange={e => {
                this.setState({text: e.target.value, saved: false}, () => {
                  this.autoCompleteSearch(this.state.text, 'text')
                })
              }}
              value={this.state.text}></textarea>
            <ShowTextAutocomplete
              text={this.state.text}
              results={this.state.searchResults}
              picked={text => {
                this.setState({text: text, saved: false, searchResults: []})
              }}
            />

          </div>
          <div className="textarea">
            <textarea
              placeholder="Notes..."
              onBlur={this.saveChanges}
              onChange={e => {
                this.setState({notes: e.target.value, saved: false})
              }}
              value={this.state.notes}></textarea>
          </div>
        </div>
        <div className="actions">
          <div className="action">
            <Heart
              filled={this.state.starred}
              bubble={e => {
                this.setState({starred: !this.state.starred}, this.saveChanges)
              }}
            />
          </div>
          <div className="action">
            <button
              type="button"
              onClick={this.saveChanges}
              disabled={this.state.saved}
              >Save</button>
          </div>
        </div>
      </div>
    )
  }
}


const ShowTextAutocomplete = ({ text, results, picked, field = 'text' }) => {

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
  console.log("searchWords", searchWords);
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
