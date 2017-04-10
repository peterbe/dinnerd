import React from 'react'
import dateFns from 'date-fns'
import { pure } from 'recompose'

export const makeWeekId = (datetime) => {
  return 'week-head-' + dateFns.format(datetime, 'YYYYW')
}

export const makeDayId = (datetime) => {
  return 'day-' + dateFns.format(datetime, 'YYYYMMDD')
}

export const ShowWeekHeaderDates = pure(
  ({ start, end }) => {
  return (
    <span className="week-head-dates">
      { dateFns.format(start, 'D MMM') }
      {' '}
      ...
      {' '}
      { dateFns.format(end, 'D MMM') }
    </span>
  )
})

export const Heart = pure(
  ({ filled, bubble, size = 18 }) => {
  return (
    <svg viewBox="0 0 24 24" height={size} version="1.1" width={size} onClick={bubble}>
      <g transform="translate(0 -1028.4)">
        <path
          d="m7 1031.4c-1.5355 0-3.0784 0.5-4.25 1.7-2.3431 2.4-2.2788 6.1 0 8.5l9.25 9.8 9.25-9.8c2.279-2.4 2.343-6.1 0-8.5-2.343-2.3-6.157-2.3-8.5 0l-0.75 0.8-0.75-0.8c-1.172-1.2-2.7145-1.7-4.25-1.7z"
          fill={filled ? '#c0392b' : '#cccccc' }/>
      </g>
    </svg>
  )
})


export function debounce(callback, wait, context = this) {
  let timeout = null
  let callbackArgs = null

  const later = () => callback.apply(context, callbackArgs)

  return function() {
    callbackArgs = arguments
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}


export const ShowFirebaseError = ({ heading, error }) => {
  if (!error) {
    return null
  }
  return (
    <div className="alert alert-danger" role="alert" style={{marginTop: 30}}>
      <h4 className="alert-heading">{ heading }</h4>
      <p>
        <code>
          { error.code }
        </code>
      </p>
      <p className="mb-0">
        { error.message }
      </p>
    </div>
  )
}


const pagifyRegex = /\b(page |p\.?|p\.? )(\d+)$/

export const pagifyScrubText = (text) => {
  // Any string that ends with...
  //   page 123
  //   p. 123
  //   p123
  //   p.123
  // gets the number part replaced with a ? character.
  return text.replace(pagifyRegex, 'page ?')
}

export const pagifyPromptText = (text) => {
  if (pagifyRegex.test(text)) {
    const defaultPage = text.match(pagifyRegex)[2]
    const page = prompt('What page this time?', defaultPage)
    if (page) {
      text = text.replace(pagifyRegex, `page ${page}`)
    }
  }
  return text
}
