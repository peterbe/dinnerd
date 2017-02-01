import { action, extendObservable } from 'mobx'
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
      days: [],
      copied: null,
      firstDateThisWeek: null,
      // dateRange: null,
      // get filteredDays() {
      //   // var matchesFilter = new RegExp(this.filter, "i")
      //   return this.todos.filter(todo => !this.filter || matchesFilter.test(todo.value))
      // }
      addDay: action((date, datetime, text = '', notes = '', starred = false) => {
        let day = new Day(date, datetime, text, notes, starred)
        this.days.push(day)
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
