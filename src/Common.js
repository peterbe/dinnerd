import React from 'react'
import dateFns from 'date-fns'


export const makeWeekId = (datetime) => {
  return 'week-head-' + dateFns.format(datetime, 'YYYYW')
}

export const makeDayId = (datetime) => {
  return 'day-' + dateFns.format(datetime, 'YYYYMMDD')
}


export const Heart = ({ filled, bubble }) => {
  return (
    <svg height="24" version="1.1" width="24" onClick={bubble}>
      <g transform="translate(0 -1028.4)">
        <path
          d="m7 1031.4c-1.5355 0-3.0784 0.5-4.25 1.7-2.3431 2.4-2.2788 6.1 0 8.5l9.25 9.8 9.25-9.8c2.279-2.4 2.343-6.1 0-8.5-2.343-2.3-6.157-2.3-8.5 0l-0.75 0.8-0.75-0.8c-1.172-1.2-2.7145-1.7-4.25-1.7z"
          fill={filled ? '#c0392b' : '#cccccc' }/>
      </g>
    </svg>
  )
}
