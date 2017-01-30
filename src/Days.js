import React, { Component } from 'react'
import dateFns from 'date-fns'
import { observer } from 'mobx-react'

import store from './Store'
import { makeDayId } from './Common'
import Day from './Day'


const Days = observer(class Days extends Component {

  loadPreviousWeek(event) {
    const firstDatetime = store.days[0].datetime
    const firstDatePreviousWeek = dateFns.subDays(firstDatetime, 7)
    this.props.loadWeek(firstDatePreviousWeek).then(() => {
      const id = makeDayId(firstDatePreviousWeek)
      const element = document.querySelector('#' + id)
      if (element) {
        element.scrollIntoView({block: 'start', behavior: 'smooth'})
      }
    })
  }

  loadNextWeek(event) {
    const lastDatetime = store.days[store.days.length - 1].datetime
    const firstDateNextWeek = dateFns.addDays(lastDatetime, 1)
    this.props.loadWeek(firstDateNextWeek).then(() => {
      const id = makeDayId(firstDateNextWeek)
      const element = document.querySelector('#' + id)
      if (element) {
        element.scrollIntoView({block: 'start', behavior: 'smooth'})
      }
    })
  }

  render() {
    const weekStartsOn = store.settings.weekStartsOnAMonday ? 1 : 0
    return (
      <div className="days">
        {
          store.days.length ?
          <div className="options top">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={this.loadPreviousWeek.bind(this)}>
              Previous week
            </button>
          </div>
          : null
        }

        { !store.days.length ? <i>Loadings...</i> : null }

        {
          store.days.map(day => {
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
          store.days.length ?
          <div className="options bottom">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={this.loadNextWeek.bind(this)}>
              Next week
            </button>
          </div>
          : null
        }
      </div>
    )
  }
})


export default Days
