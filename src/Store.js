import { action, extendObservable, ObservableMap } from 'mobx'
// import { autorun } from 'mobx'


class Day {
  constructor(date, datetime, text = '', notes = '', starred = false) {
    this.date = date
    this.datetime = datetime
    extendObservable(this, {
      text: text,
      notes: notes,
      starred: starred,
    })
  }
}

class Store {
  constructor() {
    extendObservable(this, {
      currentUser: null,
      days: new ObservableMap(),
      copied: null,
      firstDateThisWeek: null,
      currentGroup: null,
      dateRangeStart: null,
      dateRangeEnd: null,
      extendDateRange: action((firstDate, lastDate) => {
        if (this.dateRangeStart) {
          if (firstDate < this.dateRangeStart) {
            this.dateRangeStart = firstDate
          }
          if (lastDate > this.dateRangeEnd) {
            this.dateRangeEnd = lastDate
          }
        } else {
          this.dateRangeStart = firstDate
          this.dateRangeEnd = lastDate
        }
      }),
      get dateRangeLength() {
        if (this.dateRangeStart) {
          return (this.dateRangeEnd - this.dateRangeStart) / (1000 * 24 * 3600)
        } else {
          return 7
        }
      },
      get filteredDays() {
        // return this.days.values()
        return this.days.values().filter(day => {
          if (this.dateRangeStart) {
            if (day.datetime >= this.dateRangeStart && day.datetime < this.dateRangeEnd) {
              return true
            }
          } else {
            return true
          }
          return false
        }).sort((a, b) => a.datetime - b.datetime)
      },
      addDay: action((date, datetime, text = '', notes = '', starred = false) => {
        this.days.set(date, new Day(date, datetime, text, notes, starred))
      }),
      recentFavorites: null,
      settings: JSON.parse(localStorage.getItem('settings') || '{}'),
      setSetting: action((key, value) => {
        this.settings[key] = value
        localStorage.setItem('settings', JSON.stringify(this.settings))
      }),
    })
  }
}

const store = window.store = new Store()

export default store

// autorun(() => {
//   // console.log('Store changed DAYS:', store.days, store.settings);
//   console.log('Store changed DAYS:', store.days.length)
// })
