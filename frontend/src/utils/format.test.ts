import { describe, expect, it } from 'vitest'
import { formatMeetings, formatTime } from './format.ts'

describe('formatTime', () => {
  it('converts 24-hour times to 12-hour times', () => {
    expect(['00:30:00', '08:00:00', '12:00:00', '13:50:00', '23:05:00', '09:00'].map(formatTime)).toEqual([
      '12:30 AM',
      '8:00 AM',
      '12:00 PM',
      '1:50 PM',
      '11:05 PM',
      '9:00 AM',
    ])
  })
})

describe('formatMeetings', () => {
  it('groups days that share the same times', () => {
    expect(
      formatMeetings([
        { day_of_week: 0, start_time: '13:50:00', end_time: '14:40:00' },
        { day_of_week: 2, start_time: '13:50:00', end_time: '14:40:00' },
        { day_of_week: 4, start_time: '13:50:00', end_time: '15:45:00' },
      ]),
    ).toEqual(['MW 1:50 PM–2:40 PM', 'F 1:50 PM–3:45 PM'])
  })

  it('uses R for Thursday and returns nothing for no meetings', () => {
    expect(
      formatMeetings([
        { day_of_week: 1, start_time: '09:35:00', end_time: '10:50:00' },
        { day_of_week: 3, start_time: '09:35:00', end_time: '10:50:00' },
      ]),
    ).toEqual(['TR 9:35 AM–10:50 AM'])
    expect(formatMeetings([])).toEqual([])
  })
})
