import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCurrentUser, loginUser, registerUser } from './auth.ts'
import { getCourseSections, listCourses, searchCourses } from './courses.ts'
import { deleteSavedSchedule, getSavedSchedule, listSavedSchedules, saveSchedule } from './savedSchedules.ts'
import { generateSchedules } from './schedules.ts'
import { setToken } from './token.ts'

// Checks every service function against the backend routes: the URL, the method, the JSON body
// field names (matching the Pydantic request schemas), and whether the JWT is sent.

const fetchMock = vi.fn()

type Case = { name: string; call: () => Promise<unknown>; method: string; url: string; body?: unknown }

async function sent({ call }: Case) {
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
  await call()
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    method: init.method ?? 'GET',
    body: init.body === undefined ? undefined : JSON.parse(init.body as string),
    authorization: new Headers(init.headers).get('Authorization'),
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  setToken('saved.jwt.token') // present in storage, so only the auth flag decides whether it is sent
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('service requests', () => {
  it('public endpoints are called with the backend field names and never receive the token', async () => {
    const cases: Case[] = [
      { name: 'listCourses', call: () => listCourses(), method: 'GET', url: '/api/courses' },
      { name: 'searchCourses', call: () => searchCourses('CSCI 1302'), method: 'GET', url: '/api/courses/search?q=CSCI%201302' },
      { name: 'getCourseSections', call: () => getCourseSections(4), method: 'GET', url: '/api/courses/4/sections' },
      {
        name: 'registerUser',
        call: () => registerUser('Test Student', 'student@uga.edu', 'correct-horse-battery'),
        method: 'POST',
        url: '/api/auth/register',
        body: { name: 'Test Student', email: 'student@uga.edu', password: 'correct-horse-battery' },
      },
      {
        name: 'loginUser',
        call: () => loginUser('student@uga.edu', 'correct-horse-battery'),
        method: 'POST',
        url: '/api/auth/login',
        body: { email: 'student@uga.edu', password: 'correct-horse-battery' },
      },
      {
        name: 'generateSchedules',
        call: () => generateSchedules({ course_ids: [2, 5], preferences: { preferred_day_off: 'Friday', max_classes_per_day: 3 } }),
        method: 'POST',
        url: '/api/schedules/generate',
        body: { course_ids: [2, 5], preferences: { preferred_day_off: 'Friday', max_classes_per_day: 3 } },
      },
    ]

    for (const testCase of cases) {
      const request = await sent(testCase)
      expect(request, testCase.name).toEqual({ url: testCase.url, method: testCase.method, body: testCase.body, authorization: null })
    }
  })

  it('login-only endpoints are called with the backend field names and always receive the token', async () => {
    const cases: Case[] = [
      { name: 'getCurrentUser', call: () => getCurrentUser(), method: 'GET', url: '/api/auth/me' },
      { name: 'listSavedSchedules', call: () => listSavedSchedules(), method: 'GET', url: '/api/schedules/saved' },
      { name: 'getSavedSchedule', call: () => getSavedSchedule(7), method: 'GET', url: '/api/schedules/saved/7' },
      {
        name: 'saveSchedule',
        call: () => saveSchedule({ name: 'Fall 2027 - Late Start', semester: 'Fall 2027', section_ids: [11, 23] }),
        method: 'POST',
        url: '/api/schedules/saved',
        body: { name: 'Fall 2027 - Late Start', semester: 'Fall 2027', section_ids: [11, 23] },
      },
      { name: 'deleteSavedSchedule', call: () => deleteSavedSchedule(7), method: 'DELETE', url: '/api/schedules/saved/7' },
    ]

    for (const testCase of cases) {
      const request = await sent(testCase)
      expect(request, testCase.name).toEqual({
        url: testCase.url,
        method: testCase.method,
        body: testCase.body,
        authorization: 'Bearer saved.jwt.token',
      })
    }
  })
})
