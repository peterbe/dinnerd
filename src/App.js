import React, { Component } from 'react'
import dateFns from 'date-fns'
import elasticlunr from 'elasticlunr'
import lf from 'lovefield'
import { observer } from 'mobx-react'

import './App.css'
import getSchema from './Schema'
import Nav from './Nav'
import Days from './Days'
import Settings from './Settings'
import store from './Store'

const DATE_FORMAT = 'YYYY-MM-DD'


const App = observer(class App extends Component {
  constructor() {
    super()
    this.state = {
      show: 'days',
    }
    // this.loadWeek = this.loadWeek.bind(this)
  }

  componentWillMount() {
    this.schemaBuilder = getSchema()
  }

  componentWillReceiveProps(props) {
    console.warn("Perhaps the store.settings has changed!");
  }

  componentDidMount() {
    this.createDBConnection().then(() => {
      // const searchIndexAsJson = localStorage.getItem('searchIndex')
      // if (searchIndexAsJson) {
      //   // override this.searchIndex
      //   this.searchIndex = elasticlunr.Index.load(
      //     JSON.parse(searchIndexAsJson)
      //   )
      // } else {
      //   this.populateWholeIndex().then(() => {
      //     localStorage.setItem(
      //       'searchIndex',
      //       JSON.stringify(this.searchIndex)
      //     )
      //   })
      // }

      this.loadInitialWeek().then(() => {
        // Populate the index with ALL days
        const searchIndexAsJson = localStorage.getItem('searchIndex')
        if (searchIndexAsJson) {
          // override this.searchIndex
          this.searchIndex = elasticlunr.Index.load(
            JSON.parse(searchIndexAsJson)
          )
        } else {
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
          this.populateWholeIndex().then(() => {
            localStorage.setItem(
              'searchIndex',
              JSON.stringify(this.searchIndex)
            )
          })

        }
      })
    })
  }

  loadInitialWeek() {
    store.days = []
    const weekStartsOnAMonday = store.settings.weekStartsOnAMonday || false
    store.firstDateThisWeek = dateFns.startOfWeek(
      new Date(), {weekStartsOn: weekStartsOnAMonday ? 1 : 0}
    )
    return this.loadWeek(store.firstDateThisWeek)
  }

  createDBConnection() {
    return this.schemaBuilder.connect().then(db => {
      this.db = db
    })
  }

  loadWeek(firstDate) {
    if (!firstDate || typeof firstDate !== 'object') {
      throw new Error("Expect 'firstDate' to be a date object")
    }
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
      let days = store.days
      // let days = []
      // by default assume we're going to PUSH days to the end of the list
      //
      let future = false
      if (days.length) {
      //   // console.log("DAYS:", days);
      //   // console.log("DAYS[0]:", days[0]);
      //   // console.log("DAYS[0]:", days[days.length - 1]);
        // const firstDatetime = days[0].datetime
        const lastDatetime = days[days.length - 1].datetime
        if (firstDate > lastDatetime) {
          future = true
      //     op = (...args) => days.unshift(...args)
        }
      }
      //   console.log(firstDate, firstDatetime);
      // }

      // let dayNumbers = [0, 1, 3, 4, 5, 6]
      // let op = (...args) => days.push(...args)
      let op = (...args) => days.unshift(...args)
      let dayNumbers = [6, 5, 4, 3, 2, 1, 0]
      if (future) {
        // unshift in backwards
        dayNumbers.reverse()
        op = (...args) => days.push(...args)
      }
      // console.log("FUTURE?", future);
      dayNumbers.forEach(d => {
        let datetime = dateFns.addDays(firstDate, d)
        let date = dateFns.format(datetime, DATE_FORMAT)
        if (daysMap[date]) {
          op(daysMap[date])
        } else {
          op({
            date: date,
            datetime: datetime,
            text: '',
            notes: '',
            starred: false,
          })
        }
      })
      // console.log("About to sort", days.length, 'days');
      // days.sort((a, b) => a.datetime - b.datetime)
      // store.days = days
    })
  }

  populateWholeIndex() {
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


  render() {
    let page = <p>Loading...</p>
    if (this.state.show === 'days') {
      page = <Days
        searcher={this.searcher.bind(this)}
        loadWeek={this.loadWeek.bind(this)}
        updateDay={this.updateDay.bind(this)}
        // firstDateThisWeek={store.firstDateThisWeek}
      />
    } else if (this.state.show === 'settings') {
      page = <Settings
        closeSettings={e => {
          this.setState({show: 'days'})
          // this.loadInitialWeek()
        }}
        onChangeWeekStart={() => {
          // if the user has changed start day of the week, re-load
          this.loadInitialWeek()
        }}
      />
    }

    console.log('REndering Nav with:', this.firstDateThisWeek);
    return (
      <div className="container">
        <Nav
          onGotoSettings={() => {
            this.setState({show: 'settings'})
          }}

        />
        <div className="App-header">
          <h2>Hi! Waldo here!</h2>
        </div>
        { page }
      </div>
    );
  }
})

export default App
