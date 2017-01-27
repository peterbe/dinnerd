import { action, extendObservable } from 'mobx'
import { autorun } from 'mobx'


class Store {
  constructor() {
    extendObservable(this, {
      days: [],
      firstDateThisWeek: null,
      settings: JSON.parse(localStorage.getItem('settings') || '{}'),
      setSetting: action((key, value) => {
        this.settings[key] = value
        localStorage.setItem('settings', JSON.stringify(this.settings))
        // if (key === 'weekStartsOnAMonday') {
        //
        // }
      }),
    })
  }
}

const store = window.store = new Store()

export default store

autorun(() => {
  // console.log('Store changed DAYS:', store.days, store.settings);
  console.log('Store changed DAYS:', store.days.length)
})
