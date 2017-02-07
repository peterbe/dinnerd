import React, { Component } from 'react'
import dateFns from 'date-fns'
import elasticlunr from 'elasticlunr'
// import lf from 'lovefield'
import { observer } from 'mobx-react'
import zenscroll from 'zenscroll'

import './App.css'
// import getSchema from './Schema'
import Nav from './Nav'
import Days from './Days'
import Settings from './Settings'
import Favorites from './Favorites'
import User from './User'
import SignIn from './SignIn'
import Search from './Search'
import Group from './Group'
import store from './Store'
import { makeDayId } from './Common'

const DATE_FORMAT = 'YYYY-MM-DD'


// string to Date object
const decodeDatetime = (dateStr) => dateFns.parse(dateStr)
// Date object to string
const encodeDatetime = (dateObj) => dateFns.format(dateObj)


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

    this.auth = window.firebase.auth()
    this.database = window.firebase.database()
    this.auth.onAuthStateChanged(this.onAuthStateChanged.bind(this))
    // this.currentUser = null
  }

  onAuthStateChanged(user) {
    if (user) {
      // User is signed in!
      // let profilePicUrl = user.photoURL
      // let userName = user.displayName
      // console.log(user);
      // console.log(user.email);
      // this.currentUser = user
      store.currentUser = user
      // store.currentUser = {
      //   // displayName: user.displayName,
      //   email: user.email,
      //   emailVerified: user.emailVerified,
      // }
      // if (!user.emailVerified) {
      //
      // }
      // Figure out which group the user belongs to,
      // then load all days from that!
      // And...

      // If you're signed in, let's set what you're current group is
      if (!store.currentGroup && store.settings.defaultGroupId) {
        this.database.ref('/groups/' + store.settings.defaultGroupId)
        .once('value')
        .then(snapshot => {
          // console.log('SNAPSHOT', snapshot);
          // console.log('SNAPSHOT.val', snapshot.val());
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
      // this.database.ref('/groups/' + userId).once('value').then(function(snapshot) {
      //   var username = snapshot.val().username;
      //   // ...
      // });

    } else {
      // User is signed out!
      console.log('No user', 'Signed out?');
      store.currentUser = null
      // this.currentUser = null
    }
  }

  // isUserSignedIn() {
  //   return this.auth.currentUser
  // }
  //
  // getCurrentUser() {
  //   return this.auth.currentUser
  // }

  // componentWillMount() {
  //   this.schemaBuilder = getSchema()
  // }

  componentDidMount() {

    this.loadInitialWeek()

    if (store.settings.defaultGroupId) {
      this.listenOnDayRefs()

      const searchIndexAsJson = localStorage.getItem('searchIndex')
      if (searchIndexAsJson) {
        this.searchIndex = elasticlunr.Index.load(
          JSON.parse(searchIndexAsJson)
        )
      } else {
        this.searchIndex = elasticlunr(function () {
          this.addField('text')
          this.addField('notes')
          this.setRef('date')
          // not store the original JSON document to reduce the index size
          this.saveDocument(false)
        })
        this.loadSearchIndex()
      }
    }

    // this.createDBConnection().then(() => {
    //   this.loadInitialWeek().then(() => {
    //     // Populate the index with ALL days
    //     const searchIndexAsJson = localStorage.getItem('searchIndex')
    //     if (searchIndexAsJson) {
    //       // override this.searchIndex
    //       this.searchIndex = elasticlunr.Index.load(
    //         JSON.parse(searchIndexAsJson)
    //       )
    //     } else {
    //       // Set up the searchIndex before calling
    //       // loadWeek() for the first time.
    //       this.searchIndex = elasticlunr(function () {
    //         this.addField('text')
    //         this.addField('notes')
    //         this.setRef('date')
    //         // not store the original JSON document to reduce the index size
    //         this.saveDocument(false)
    //       })
    //       this.populateWholeIndex().then(() => {
    //         localStorage.setItem(
    //           'searchIndex',
    //           JSON.stringify(this.searchIndex)
    //         )
    //       })
    //     }
    //   })
    // })
  }

  listenOnDayRefs() {
    this.daysRef = this.database.ref(
      'groups/' + store.settings.defaultGroupId + '/days'
    )
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
    })
    this.daysRef.on('child_changed', child => {
      // console.log('DAY CHANGED!', child.key, child.val());
      const data = child.val()
      // console.log('DAY CHANGED!', child.key, data);
      store.addDay(
        child.key,
        decodeDatetime(data.datetime),
        data.text,
        data.notes,
        data.starred
      )
    })
  }

  loadSearchIndex() {
    if (this._searchCache) {
      this._searchCache = {}
    }
    this.daysRef.once('value', snapshot => {
      snapshot.forEach(child => {
        const data = child.val()
        // console.log('CHILD', child.key, child.val());
        // THIS MAYBE?
        if (data.text || data.notes) {
          this.searchIndex.addDoc({
            date: child.key,
            text: data.text,
            notes: data.notes,
          })
        }
      })
      localStorage.setItem(
        'searchIndex',
        JSON.stringify(this.searchIndex)
      )
    })
  }

  loadInitialWeek() {
    const weekStartsOnAMonday = store.settings.weekStartsOnAMonday || false
    store.firstDateThisWeek = dateFns.startOfWeek(
      new Date(), {weekStartsOn: weekStartsOnAMonday ? 1 : 0}
    )
    return this.loadWeek(store.firstDateThisWeek)
  }

  loadWeek(firstDate) {  // should maybe be called loadBlankWeekDays
    if (!firstDate || typeof firstDate !== 'object') {
      throw new Error("Expect 'firstDate' to be a date object")
    }
    // console.log('HERE IN loadWeek', firstDate);
    // let daysMap = {}
    let lastDate = dateFns.addDays(firstDate, 7)
    store.extendDateRange(firstDate, lastDate)

    // XXX look into mobx.transaction https://jsfiddle.net/rubyred/o5se1urx/
    let dayNumbers = [0, 1, 2, 3, 4, 5, 6]
    dayNumbers.forEach(d => {
      let datetime = dateFns.addDays(firstDate, d)
      let date = dateFns.format(datetime, DATE_FORMAT)
      if (!store.days.has(date)) {
        // put a blank on in lieu
        store.addDay(date, datetime)
      }
    })
  }

  updateDay(day, data) {
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
    return dayRef.set({
      date: day.date,  // XXX is hit nsecessary?
      datetime: encodeDatetime(day.datetime),
      text: data.text,
      notes: data.notes,
      starred: data.starred,
    })
    // XXX ALso need to this.searchIndex.addDoc(...)
    //...
    // and run...
    // localStorage.setItem(
    //   'searchIndex',
    //   JSON.stringify(this.searchIndex)
    // )

    // return this.db.insertOrReplace().into(daysTable).values([row]).exec()
    // .then(inserted => {
    //   inserted.forEach(day => {
    //     if (day.text || day.notes) {
    //       this.searchIndex.addDoc({
    //         date: day.date,
    //         text: day.text,
    //         notes: day.notes,
    //       })
    //     }
    //   })
    //   localStorage.setItem(
    //     'searchIndex',
    //     JSON.stringify(this.searchIndex)
    //   )
    //   return inserted
    // })
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

    let days = found.map(result => result.ref)
    return store.days.values().filter(day => {
      return days.includes(day.date)
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
