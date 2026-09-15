import { describe, expect, it } from 'vitest'
import type { Course } from '../types/course.ts'
import { EMPTY_PREFERENCES, type GenerateSchedulesResponse, type PreferenceForm } from '../types/schedule.ts'
import {
  MAX_COURSES,
  buildGenerateRequest,
  describePreferences,
  emptyResultReason,
  validateScheduleRequest,
} from './schedule.ts'

function course(id: number, code: string): Course {
  return { id, course_code: code, course_name: code, department: 'Test', description: null, credit_hours: 3 }
}

const COURSES = [course(12, 'CSCI 1302'), course(3, 'MATH 2250')]

const ALL_PREFERENCES: PreferenceForm = {
  earliestStart: '09:00',
  latestEnd: '15:00',
  preferredDayOff: 'Friday',
  maxClassesPerDay: '3',
}

function response(counts: Partial<GenerateSchedulesResponse>): GenerateSchedulesResponse {
  return { total_combinations: 27, conflict_free_count: 24, count: 24, schedules: [], ...counts }
}

describe('buildGenerateRequest', () => {
  it('sends only the course ids, in selection order, when no preferences are set', () => {
    expect(buildGenerateRequest(COURSES, EMPTY_PREFERENCES)).toStrictEqual({ course_ids: [12, 3] })
  })

  it('sends every filled-in preference in the backend format', () => {
    expect(buildGenerateRequest(COURSES, ALL_PREFERENCES)).toStrictEqual({
      course_ids: [12, 3],
      preferences: {
        earliest_start: '09:00',
        latest_end: '15:00',
        preferred_day_off: 'Friday',
        max_classes_per_day: 3, // a number, not the text "3"
      },
    })
  })

  it('leaves empty fields out instead of sending empty strings', () => {
    const request = buildGenerateRequest(COURSES, { ...EMPTY_PREFERENCES, latestEnd: '17:00', preferredDayOff: 'Monday' })

    expect(JSON.stringify(request)).toBe(
      '{"course_ids":[12,3],"preferences":{"latest_end":"17:00","preferred_day_off":"Monday"}}',
    )
  })
})

describe('validateScheduleRequest', () => {
  it('accepts courses with no preferences or with valid preferences', () => {
    expect(validateScheduleRequest(COURSES, EMPTY_PREFERENCES)).toBeNull()
    expect(validateScheduleRequest(COURSES, ALL_PREFERENCES)).toBeNull()
  })

  it('needs between 1 and 8 courses', () => {
    const nine = Array.from({ length: MAX_COURSES + 1 }, (_, index) => course(index + 1, `TEST ${index}`))

    expect(validateScheduleRequest([], EMPTY_PREFERENCES)).toBe('Select at least one course.')
    expect(validateScheduleRequest(nine, EMPTY_PREFERENCES)).toBe('Select at most 8 courses.')
  })

  it.each(['0', '-1', '2.5'])('rejects %s as the maximum classes per day', (value) => {
    expect(validateScheduleRequest(COURSES, { ...EMPTY_PREFERENCES, maxClassesPerDay: value })).toBe(
      'Maximum classes per day must be a whole number of at least 1.',
    )
  })

  it.each([
    ['15:00', '09:00'],
    ['10:00', '10:00'],
  ])('rejects a day that starts at %s and ends at %s', (earliestStart, latestEnd) => {
    expect(validateScheduleRequest(COURSES, { ...EMPTY_PREFERENCES, earliestStart, latestEnd })).toBe(
      'Latest end must be later than earliest start.',
    )
  })

  it('allows only one of the two times to be set', () => {
    expect(validateScheduleRequest(COURSES, { ...EMPTY_PREFERENCES, latestEnd: '08:00' })).toBeNull()
  })
})

describe('describePreferences', () => {
  it('describes each preference that is set', () => {
    expect(describePreferences(ALL_PREFERENCES)).toEqual([
      'No classes before 9:00 AM',
      'Done by 3:00 PM',
      'Friday off',
      'At most 3 classes per day',
    ])
    expect(describePreferences({ ...EMPTY_PREFERENCES, maxClassesPerDay: '1' })).toEqual(['At most 1 class per day'])
    expect(describePreferences(EMPTY_PREFERENCES)).toEqual([])
  })
})

describe('emptyResultReason', () => {
  it('is null when there are schedules to show', () => {
    expect(emptyResultReason(response({ count: 7 }))).toBeNull()
  })

  it('blames conflicts when no combination is conflict-free', () => {
    expect(emptyResultReason(response({ conflict_free_count: 0, count: 0 }))).toBe('conflicts')
  })

  it('blames preferences when conflict-free schedules existed but none matched', () => {
    expect(emptyResultReason(response({ conflict_free_count: 63, count: 0 }))).toBe('preferences')
  })
})
