import React, { Component } from 'react'
import dateFns from 'date-fns'
import { observer } from 'mobx-react'
import zenscroll from 'zenscroll'

import store from './Store'
import { makeDayId } from './Common'
import Day from './Day'


const Days = observer(class Days extends Component {

  constructor(props) {
    super(props)
    this.state = {
      loadingPreviousWeek: false,
      loadingNextWeek: false,
    }
  }

  loadPreviousWeek(event) {
    const firstDatetime = store.dateRangeStart
    const firstDatePreviousWeek = dateFns.subDays(firstDatetime, 7)
    this.props.loadWeek(firstDatePreviousWeek)
    this.setState({loadingPreviousWeek: false}, () => {
      const id = makeDayId(firstDatePreviousWeek)
      const element = document.querySelector('#' + id)
      if (element) {
        zenscroll.to(element)
      }
    })
  }

  loadNextWeek(event) {
    // const lastDatetime = store.days[store.days.length - 1].datetime
    const firstDateNextWeek = store.dateRangeEnd
    // const firstDateNextWeek = dateFns.addDays(lastDatetime, 1)
    this.props.loadWeek(firstDateNextWeek)
    this.setState({loadingNextWeek: false}, () => {
      const id = makeDayId(firstDateNextWeek)
      const element = document.querySelector('#' + id)
      if (element) {
        zenscroll.to(element)
      }
    })
  }

  render() {
    const weekStartsOn = store.settings.weekStartsOnAMonday ? 1 : 0
    return (
      <div className="days">
        {/*
          By default currentUser===null, but if firebase
          has successfully run onAuthStateChanged at least once
          then it gets set to 'false'.
          Only then show the unauthorized warning.
          */}
        {
          store.currentUser === false && !store.offline ?
          <ShowUnauthorizedWarning
            gotoSignInPage={this.props.gotoSignInPage}
          />
          : null
        }

        {
          store.days.size ?
          <div className="options top">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onTouchStart={e => {
                this.setState({loadingPreviousWeek: true})
                setTimeout(() => {
                  this.setState({loadingPreviousWeek: false})
                }, 1000)
              }}
              onClick={this.loadPreviousWeek.bind(this)}>
              Previous week
            </button>
          </div>
          : null
        }

        { !store.days.size ? <i>Loading...</i> : null }

        {
          store.filteredDays.map(day => {
            let firstDateThisWeek = dateFns.isEqual(
              day.datetime,
              dateFns.startOfWeek(day.datetime, {weekStartsOn: weekStartsOn})
            )
            return <Day
              day={day}
              key={day.date}
              updateDay={this.props.updateDay}
              searcher={this.props.searcher}
              firstDateThisWeek={firstDateThisWeek}
            />
          })
        }
        {
          store.days.size ?
          <div className="options bottom">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onTouchStart={e => {
                this.setState({loadingNextWeek: true})
                setTimeout(() => {
                  this.setState({loadingNextWeek: false})
                }, 1000)
              }}
              onClick={this.loadNextWeek.bind(this)}>
              { this.state.loadingNextWeek ? 'Loading...' : 'Next week' }
            </button>
          </div>
          : null
        }
      </div>
    )
  }
})


export default Days


const ShowUnauthorizedWarning = ({ gotoSignInPage }) => {
  return (
    <div className="alert alert-info" role="alert" style={{marginTop: 30}}>
      <h4 className="alert-heading">Not Signed In</h4>
      <p>
        It's OK but nothing you enter will be backed up.
      </p>
      <p className="mb-0">
        <button
          type="button"
          className="btn btn-warning btn-block"
          onClick={e => {
            gotoSignInPage()
          }}
        >
          Sign In
        </button>
      </p>
    </div>
  )
}
