import React, { Component } from 'react'
import elasticlunr from 'elasticlunr'
import lf from 'lovefield'
import dateFns from 'date-fns'

import getSchema from './Schema'
import { makeWeekId } from './Common'
import Day from './Day'
import { settings } from './Settings'
const DATE_FORMAT = 'YYYY-MM-DD'


export default class Days extends Component {
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

    this.createDBConnection().then(() => {
      this.loadWeek(this.props.firstDateThisWeek).then(() => {
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

  createDBConnection() {
    return this.schemaBuilder.connect().then(db => {
      this.db = db
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
    const weekStartsOn = settings.weekStartsOnAMonday ? 1 : 0
    console.log('Rendering with Defaults.weekStartsOnAMonday:', settings.weekStartsOnAMonday);
    console.log('Rendering with weekStartsOn:', weekStartsOn);
    return (
      <div className="days">
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
