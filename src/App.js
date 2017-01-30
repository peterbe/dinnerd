import React, { Component } from 'react'
import dateFns from 'date-fns'
import elasticlunr from 'elasticlunr'
import lf from 'lovefield'
import { observer } from 'mobx-react'
import zenscroll from 'zenscroll'

import './App.css'
import getSchema from './Schema'
import Nav from './Nav'
import Days from './Days'
import Settings from './Settings'
import Favorites from './Favorites'
import Search from './Search'
import store from './Store'
import { makeDayId } from './Common'

const DATE_FORMAT = 'YYYY-MM-DD'


const App = observer(class App extends Component {
  constructor() {
    super()

    // let defaultPage = 'days'
    // if (document.location.hash.match(/^#page:(\w+)/)) {
    //   defaultPage = document.location.hash.match(/^#page:(\w+)/)[1]
    // }
    this.state = {
      page: 'days',
    }
  }

  componentWillMount() {
    this.schemaBuilder = getSchema()
  }

  componentDidMount() {
    this.createDBConnection().then(() => {
      this.loadInitialWeek().then(() => {
        // Populate the index with ALL days
        const searchIndexAsJson = localStorage.getItem('searchIndex')
        if (searchIndexAsJson) {
          // override this.searchIndex
          this.searchIndex = elasticlunr.Index.load(
            JSON.parse(searchIndexAsJson)
          )
        } else {
          // Set up the searchIndex before calling
          // loadWeek() for the first time.
          this.searchIndex = elasticlunr(function () {
            this.addField('text')
            this.addField('notes')
            this.setRef('date')
            // not store the original JSON document to reduce the index size
            this.saveDocument(false)
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
      // by default assume we're going to PUSH days to the end of the list
      let future = false
      if (days.length) {
        const lastDatetime = days[days.length - 1].datetime
        if (firstDate > lastDatetime) {
          future = true
        }
      }
      let op = (...args) => days.unshift(...args)
      let dayNumbers = [6, 5, 4, 3, 2, 1, 0]
      if (future) {
        // unshift in backwards
        dayNumbers.reverse()
        op = (...args) => days.push(...args)
      }
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
      return results
    })
  }

  populateWholeIndex() {
    const daysTable = this.db.getSchema().table('Days');
    return this.db.select().from(daysTable)
    .exec().then(results => {
      results.forEach(result => {
        if (result.text || result.notes) {
          this.searchIndex.addDoc({
            date: result.date,
            text: result.text,
            notes: result.notes,
          })
        }
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

    // don't forget to update the big mutable
    day.text = data.text
    day.notes = data.notes
    day.starred = data.starred

    // update the search cache
    if (this._searchCache && this._searchCache[day.date]) {
      delete this._searchCache[day.date]
    }

    return this.db.insertOrReplace().into(daysTable).values([row]).exec()
    .then(inserted => {
      inserted.forEach(day => {
        if (day.text || day.notes) {
          this.searchIndex.addDoc({
            date: day.date,
            text: day.text,
            notes: day.notes,
          })
        }
      })
      localStorage.setItem(
        'searchIndex',
        JSON.stringify(this.searchIndex)
      )
      return inserted
    })
  }

  getFavorites() {
    const daysTable = this.db.getSchema().table('Days');
    return this.db.select().from(daysTable)
    .where(
      daysTable.starred.eq(true)
    )
    .exec().then(results => {
      return results
    })
  }

  searcher(text, searchConfig) {
    let found = this.searchIndex.search(
      text,
      searchConfig,
    )
    if (!found.length) {
      return Promise.resolve([])
    }
    if (!this._searchCache) {
      // If this starts getting too large and bloated,
      // consider a LRU cache like
      // https://github.com/rsms/js-lru
      this._searchCache = {}
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

    if (this.state.page === 'settings') {
      page = <Settings
        onClosePage={e => {
          this.setState({page: 'days'})
        }}
        onChangeWeekStart={() => {
          // if the user has changed start day of the week, re-load
          this.loadInitialWeek()
        }}
      />
    } else if (this.state.page === 'search') {
      page = <Search
        searcher={this.searcher.bind(this)}
        onClosePage={e => {
          this.setState({page: 'days'})
          // this.loadInitialWeek()
        }}
      />
    } else if (this.state.page === 'starred') {
      page = <Favorites
        getFavorites={this.getFavorites}
        onClosePage={e => {
          this.setState({page: 'days'})
          if (!store.days.length) {
            this.loadInitialWeek()
          }
        }}
      />
    } else {
      if (this.state.page !== 'days') {
        // throw new Error(`Unsure about page '${page}'`)
        console.warn(`Unsure about page '${this.state.page}'`)
      }
      page = <Days
        searcher={this.searcher.bind(this)}
        loadWeek={this.loadWeek.bind(this)}
        updateDay={this.updateDay.bind(this)}
        // firstDateThisWeek={store.firstDateThisWeek}
      />
    }

    return (
      <div className="container">
        <Nav
          onGotoWeek={(refresh = false) => {
            this.setState({page: 'days'}, () => {
              const id = makeDayId(store.firstDateThisWeek)
              const element = document.querySelector('#' + id)
              if (refresh) {
                this.loadInitialWeek().then(() => {
                  zenscroll.to(element)
                })
              } else {
                setTimeout(() => {
                  zenscroll.to(element)
                }, 100)
              }
            })
          }}
          onGotoSettings={() => {
            this.setState({page: 'settings'})
          }}
          onGotoStarred={() => {
            this.getFavorites().then(results => {
              store.recentFavorites = results
            })
            this.setState({page: 'starred'})
          }}
          onGotoSearch={() => {
            this.setState({page: 'search'})
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
