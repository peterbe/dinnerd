import React, { Component } from 'react'
import elasticlunr from 'elasticlunr'
import { observer } from 'mobx-react'
import zenscroll from 'zenscroll'
import * as firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/database'
import { pure } from 'recompose'

import {
  format,
  getTime,
  startOfWeek,
  addDays,
  toDate,
} from 'date-fns/esm'

// import Perf from 'react-addons-perf'
// window.Perf = Perf

import './App.css'
import Nav from './Nav'
import Days from './Days'
import Settings from './Settings'
import Favorites from './Favorites'
import User from './User'
import SignIn from './SignIn'
import Search from './Search'
import Group from './Group'
import store from './Store'
import { makeDayId, pagifyScrubText } from './Common'

// Because I love namespaces
const dateFns = {
  toDate: toDate,
  getTime: getTime,
  startOfWeek: startOfWeek,
  addDays: addDays,
  format: format,
}

const DATE_FORMAT = 'YYYY-MM-DD'

// string to Date object
const decodeDatetime = dateStr => dateFns.toDate(dateStr)
// Date object to string
const encodeDatetime = dateObj => dateFns.getTime(dateObj)

if (process.env.REACT_APP_DEV === 'true') {
  store.dev = true
  document.title = 'Dev ' + document.title
}

const App = observer(class App extends Component {
  constructor() {
    super()

    this.state = {
      page: 'days',
    }

    // Initialize Firebase
    const config = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    }
    const firebaseApp = firebase.initializeApp(config)
    this.auth = firebaseApp.auth()
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this))
    if (process.env.REACT_APP_FIREBASE_LOGGING === 'true') {
      firebaseApp.database.enableLogging(true)
    }
    this.database = firebaseApp.database()
  }

  onAuthStateChanged = (user) => {

    // Perf.start()

    if (user) {
      // User is signed in!
      // let profilePicUrl = user.photoURL
      // let userName = user.displayName
      store.currentUser = user
      // If you're signed in, let's set what you're current group is
      if (!store.currentGroup && store.settings.defaultGroupId) {
        this.database.ref('/groups/' + store.settings.defaultGroupId)
        .once('value')
        .then(snapshot => {
          if (snapshot.val()) {
            store.currentGroup = {
              id: store.settings.defaultGroupId,
              name: snapshot.val().name
            }
          }
        }, error => {
          console.warn('Unable to look up group');
          console.error(error);
        })
      } else {
        // console.warn('Figure out which is your default group!');
        this.setState({page: 'group'})
      }

      // Only bother for people who bother to sign in.
      if (window.addToHomescreen) {
        setTimeout(() => {
          // window.addToHomescreen({debug: true})
          window.addToHomescreen()
        }, 3000)
      }

    } else {
      // User is signed out!
      console.log('No user', 'Signed out?');
      store.currentUser = false
    }
  }

  componentDidMount() {

    // setTimeout(() => {
    //   Perf.stop()
    //   Perf.printWasted()
    // }, 20000)

    this.searchData = {}

    if (this.database) {
      this.database.ref('.info/connected')
      .on('value', snapshot => {
        if (snapshot.val()) { // Yay! Connected!
          if (this.setOfflineTimeout) {
            window.clearTimeout(this.setOfflineTimeout)
          }
          this.triggerNotOffline()
        } else {
          console.log('navigator.onLine?', navigator.onLine);
          if (store.offline === null) {
            // It it hasn't been set yet, give it some time to do so
            this.setOfflineTimeout = window.setTimeout(() => {
              this.triggerOffline()
            }, 2000);
          } else {
            this.triggerOffline()
          }
        }
      })
    }

    this.loadInitialWeek()

    if (store.settings.defaultGroupId) {
      // this.listenOnDayRefs()

      const searchIndexAsJson = localStorage.getItem('searchIndex')
      const searchDataAsJson = localStorage.getItem('searchData')
      if (searchIndexAsJson && searchDataAsJson) {
        // console.log('this.searchIndex created from JSON');
        this.searchIndex = elasticlunr.Index.load(
          JSON.parse(searchIndexAsJson)
        )
        this.searchData = JSON.parse(searchDataAsJson)

        // Offline or not, fill in as many days as we can from
        // the localStorage snapshot.
        const dayDates = Object.keys(this.searchData)
        if (dayDates.length) {
          dayDates.forEach(date => {
            let data = this.searchData[date]
            store.addDay(
              date,
              decodeDatetime(data.datetime),
              data.text,
              data.notes,
              data.starred
            )
          })
        }

      } else {
        // console.log('this.searchIndex created from, elasticlunr', elasticlunr);
        // this.searchIndex = elasticlunr(function () {
        //   this.addField('text')
        //   this.addField('notes')
        //   this.setRef('date')
        //   // not store the original JSON document to reduce the index size
        //   this.saveDocument(false)
        // })
        // this.searchData = {}
        this.loadSearchIndex()
      }
    }
  }

  triggerNotOffline = () => {
    store.offline = false
  }

  triggerOffline = () => {
    store.offline = true
  }

  listenOnDayRefs = () => {
    if (!store.dateRangeStart) {
      throw new Error('store.dateRangeStart not set')
    }
    if (!store.dateRangeEnd) {
      throw new Error('store.dateRangeEnd not set')
    }
    if (this.daysRef) {
      this.daysRef.off()
    }
    this.daysRef = this.database.ref(
      'groups/' + store.settings.defaultGroupId + '/days'
    )
    .orderByChild('datetime')
    .startAt(encodeDatetime(store.dateRangeStart))
    .endAt(encodeDatetime(store.dateRangeEnd))

    this.daysRef.on('child_added', child => {
      const data = child.val()
      // console.log('DAY ADDED!', child.key, data);
      store.addDay(
        child.key,
        decodeDatetime(data.datetime),
        data.text,
        data.notes,
        data.starred
      )
      if (this.differentSearchData(child.key, data)) {
        this.searchData[child.key] = {
          date: child.key,
          datetime: data.datetime,
          text: data.text,
          notes: data.notes,
          starred: data.starred,
        }
        localStorage.setItem('searchData', JSON.stringify(this.searchData))
      }
    })
    this.daysRef.on('child_changed', child => {
      // console.log('DAY CHANGED!', child.key, child.val());
      const data = child.val()
      store.addDay(
        child.key,
        decodeDatetime(data.datetime),
        data.text,
        data.notes,
        data.starred
      )
      if (this.differentSearchData(child.key, data)) {

        this.searchData[child.key] = {
          date: child.key,
          datetime: data.datetime,
          text: data.text,
          notes: data.notes,
          starred: data.starred,
        }
        localStorage.setItem('searchData', JSON.stringify(this.searchData))
      }
    })
  }

  differentSearchData = (date, data) => {
    // compare 'data' with 'this.searchData[date]' and if any of them is
    // different return true.
    if (!this.searchData[date]) {
      return true
    }
    let differentKeys = Object.keys(data).filter(key => {
      return this.searchData[date] && data[key] !== this.searchData[date][key]
    })
    return !!differentKeys.length
  }

  loadSearchIndex = () => {
    // console.log('this.searchIndex created from, elasticlunr', elasticlunr);
    this.searchIndex = elasticlunr(function () {
      this.addField('text')
      this.addField('notes')
      this.setRef('date')
      // not store the original JSON document to reduce the index size
      this.saveDocument(false)
    })
    this.searchData = {}
    if (this._searchCache) {
      this._searchCache = {}
    }
    this.database.ref(
      'groups/' + store.settings.defaultGroupId + '/days'
    )
    .once('value', snapshot => {
      snapshot.forEach(child => {
        const data = child.val()
        if (data.text || data.notes) {
          this.searchIndex.addDoc({
            date: child.key,
            text: data.text,
            notes: data.notes,
          })
          this.searchData[child.key] = {
            date: child.key,
            datetime: data.datetime,
            text: data.text,
            notes: data.notes,
            starred: data.starred,
          }
        }
      })
      localStorage.setItem(
        'searchIndex',
        JSON.stringify(this.searchIndex)
      )
      localStorage.setItem(
        'searchData',
        JSON.stringify(this.searchData)
      )
    })
  }

  loadInitialWeek = () => {
    const weekStartsOnAMonday = store.settings.weekStartsOnAMonday || false
    store.firstDateThisWeek = dateFns.startOfWeek(
      new Date(), {weekStartsOn: weekStartsOnAMonday ? 1 : 0}
    )
    return this.loadWeek(store.firstDateThisWeek)
  }

  loadWeek = (firstDate) => {  // should maybe be called loadBlankWeekDays
    if (!firstDate || typeof firstDate !== 'object') {
      throw new Error("Expect 'firstDate' to be a date object")
    }
    let lastDate = dateFns.addDays(firstDate, 7)
    store.extendDateRange(firstDate, lastDate)
    let dayNumbers = [0, 1, 2, 3, 4, 5, 6]
    dayNumbers.forEach(d => {
      let datetime = dateFns.addDays(firstDate, d)
      let date = dateFns.format(datetime, DATE_FORMAT)
      if (!store.days.has(date)) {
        // put a blank one in lieu
        // console.log('ADDING', date, datetime);
        store.addDay(date, datetime)
      } else {
        // console.log('SKIPPING', date, datetime);
      }
    })
    this.listenOnDayRefs()
  }

  updateDay = (day, data) => {
    // don't forget to update the big mutable
    day.text = data.text
    day.notes = data.notes
    day.starred = data.starred

    // update the search cache
    if (this._searchCache && this._searchCache[day.date]) {
      delete this._searchCache[day.date]
    }

    const dayRef = this.database.ref(
      'groups/' + store.settings.defaultGroupId + '/days/' + day.date
    )
    this.searchIndex.addDoc({
      date: day.date,
      text: data.text,
      notes: data.notes,
    })
    localStorage.setItem('searchIndex', JSON.stringify(this.searchIndex))
    this.searchData[day.date] = {
      date: day.date,
      datetime: encodeDatetime(day.datetime),
      text: data.text,
      notes: data.notes,
      starred: data.starred,
    }
    localStorage.setItem('searchData', JSON.stringify(this.searchData))
    if (store.currentUser) {
      return dayRef.set({
        date: day.date,  // XXX is this necessary
        datetime: encodeDatetime(day.datetime),
        text: data.text,
        notes: data.notes,
        starred: data.starred,
      })
    } else {
      return Promise.resolve(null)
    }

  }

  getFavorites = () => {
    return this.database.ref(
      'groups/' + store.settings.defaultGroupId + '/days'
    )
    .orderByChild('starred')
    .equalTo(true)
    .once('value')
    .then(snapshot => {
      let results = []
      // Strange, snapshot has a .forEach but no .map or .filter
      snapshot.forEach(child => {
        results.push(child.val())
      })
      results.sort((a, b) => {
        return b.datetime - a.datetime
      })
      let hashes = new Set()
      results = results.filter(result => {
        let hash = result.text + result.notes
        hash = hash.toLowerCase()
        if (!hashes.has(hash)) {
          hashes.add(hash)
          return true
        }
        return false
      })
      return results
    })
  }

  searcher = (text, searchConfig) => {
    if (!text.trim()) {
      throw new Error('Empty search')
    }
    let found = this.searchIndex.search(
      text,
      searchConfig,
    )
    console.log('FOUND', found);
    if (!found.length) {
      return []
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
      return cached
    }
    let uniqueTexts = new Set()
    let key = 'text'
    if (searchConfig.fields.notes) {
        key = 'notes'
    }
    return found.map(result => {
      return this.searchData[result.ref]
    }).filter(result => {
      let hash = result[key].toLowerCase()
      if (key === 'notes') {
        // This will make "some cookbook page 123" and "some cookbook p.100"
        // both into "some cookbook page ?"
        hash = pagifyScrubText(hash)
      }
      if (!uniqueTexts.has(hash)) {
        uniqueTexts.add(hash)
        return true
      }
      return false
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
          store.dateRangeStart = null
          store.dateRangeEnd = null
          this.loadInitialWeek()
        }}
        onClearCache={() => {
          localStorage.removeItem('searchData')
          localStorage.removeItem('searchIndex')
          window.location.reload(true)
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
    } else if (this.state.page === 'user') {
      page = <User
        user={store.currentUser}
        onSignOut={() => {
          this.auth.signOut().then(() => {
            // Sign-out successful.
            this.setState({page: 'days'}, () => {
              store.currentUser = null
              if (!store.days.length) {
                this.loadInitialWeek()
              }
            })
          }, (error) => {
            // An error happened.
            console.warn('Unable to sign out');
            console.error(error);
          })
        }}
        onClosePage={e => {
          this.setState({page: 'days'})
          if (!store.days.length) {
            this.loadInitialWeek()
          }
        }}
      />
    } else if (this.state.page === 'signin') {
      page = <SignIn
        auth={this.auth}
        onUserCreated={() => {
          store.currentUser.sendEmailVerification().then(() => {
            // XXX flash message?
            console.log("Email verification email sent. Check your inbox.");
          }, error => {
            console.error(error);
          })
        }}
        onClosePage={e => {
          // XXX if there is already a group in store.settings
          // or something, then no need to redirect to the group page.
          this.setState({page: 'group'})
        }}
      />
    } else if (this.state.page === 'group' && store.currentUser) {
      page = <Group
        auth={this.auth}
        database={this.database}
        onDefaultGroupChanged={() => {
          store.days.clear()
          this.loadInitialWeek()
          this.daysRef.off()
          this.listenOnDayRefs()

          this.loadSearchIndex()
        }}
        onClosePage={e => {
          this.setState({page: 'days'})
          if (!store.days.length) {
            this.loadInitialWeek()
          }
        }}
      />
    } else {
      if (this.state.page !== 'days' && store.currentUser) {
        // throw new Error(`Unsure about page '${page}'`)
        console.warn(`Unsure about page '${this.state.page}'`)
      }
      page = <Days
        searcher={this.searcher.bind(this)}
        loadWeek={this.loadWeek.bind(this)}
        updateDay={this.updateDay.bind(this)}
        gotoSignInPage={() => {
          this.setState({page: 'signin'})
        }}
        // firstDateThisWeek={store.firstDateThisWeek}
      />
    }

    return (
      <div className="container">
        <Nav
          onGotoUser={() => {
            this.setState({page: 'user'})
          }}
          onGotoSignIn={() => {
            this.setState({page: 'signin'})
          }}
          onGotoWeek={(resetDateRange = false) => {
            this.setState({page: 'days'}, () => {
              if (resetDateRange) {
                store.dateRangeStart = store.firstDateThisWeek
                store.dateRangeEnd = dateFns.addDays(store.firstDateThisWeek, 7)
              }
              const id = makeDayId(store.firstDateThisWeek)
              const element = document.querySelector('#' + id)
              setTimeout(() => {
                zenscroll.to(element)
              }, 100)
            })
          }}
          onGotoSettings={() => {
            this.setState({page: 'settings'})
          }}
          onGotoGroup={() => {
            this.setState({page: 'group'})
          }}
          onGotoStarred={() => {
            this.getFavorites().then(results => {
              // console.log('FAVORITES RESULT:', results);
              store.recentFavorites = results
            })
            this.setState({page: 'starred'})
          }}
          onGotoSearch={() => {
            this.setState({page: 'search'})
            setTimeout(() => {
              const el = document.querySelector('.search input[type="search"]')
              if (el) {
                el.focus()
              } else {
                console.warn('No search input element');
              }
            }, 200)
          }}
        />
        <div className="page-container" style={{marginTop: 60}}>
          <ShowOfflineWarning offline={store.offline}/>
          { page }
        </div>
      </div>
    );
  }
})

export default App


const ShowOfflineWarning = pure(
  ({ offline }) => {
  if (offline !== true) {
    return null
  }
  return (
    <div className="alert alert-danger" role="alert" style={{marginTop: 30}}>
      <h4 className="alert-heading">Offline!</h4>
      <p>
        Seems you are offline :(
      </p>
      <p className="mb-0">
        <button
          type="button"
          className="btn btn-primary"
          onClick={e => {
            window.location.reload()
          }}
        >
          Try Reloading
        </button>
      </p>
    </div>
  )
})
