import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiDelete, apiGet, apiPost, setUnauthorizedHandler } from './api.ts'
import { getToken, setToken } from './token.ts'

const fetchMock = vi.fn()

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function sentHeaders(callIndex = 0): Headers {
  return new Headers((fetchMock.mock.calls[callIndex][1] as RequestInit).headers)
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  setUnauthorizedHandler(null)
})

describe('api', () => {
  it('adds the saved JWT as a Bearer token on protected requests', async () => {
    setToken('header.payload.signature')
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await apiGet('/api/schedules/saved', { auth: true })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/schedules/saved')
    expect(sentHeaders().get('Authorization')).toBe('Bearer header.payload.signature')
  })

  it('does not send the token to public endpoints', async () => {
    setToken('header.payload.signature')
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await apiGet('/api/courses')

    expect(sentHeaders().get('Authorization')).toBeNull()
  })

  it('sends JSON bodies with both the token and the content type', async () => {
    setToken('header.payload.signature')
    fetchMock.mockResolvedValue(jsonResponse(201, { id: 9 }))

    await apiPost('/api/schedules/saved', { name: 'Fall', semester: 'Fall 2027', section_ids: [1, 2] }, { auth: true })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"Fall","semester":"Fall 2027","section_ids":[1,2]}')
    expect(sentHeaders().get('Content-Type')).toBe('application/json')
    expect(sentHeaders().get('Authorization')).toBe('Bearer header.payload.signature')
  })

  it('forgets the token and signals logout when a protected request gets 401', async () => {
    setToken('expired-token')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Invalid or expired token.' }))

    await expect(apiGet('/api/auth/me', { auth: true })).rejects.toThrow('Invalid or expired token.')

    expect(getToken()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('treats a 401 from a public endpoint (a wrong password) as a normal error', async () => {
    setToken('still-valid')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Incorrect email or password.' }))

    await expect(apiPost('/api/auth/login', { email: 'a@uga.edu', password: 'x' })).rejects.toThrow(
      'Incorrect email or password.',
    )

    expect(getToken()).toBe('still-valid')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports a request that never reaches the server as the server being unavailable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(apiGet('/api/courses')).rejects.toMatchObject({
      status: 0,
      message: "Can't reach the CoursePilot server. Check your connection and try again.",
    })
  })

  it('turns FastAPI error bodies into messages a student can read', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(422, { detail: [{ loc: ['body', 'course_ids'], msg: 'Value error, Select at least one course.' }] }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 418 }))

    await expect(apiPost('/api/schedules/generate', { course_ids: [] })).rejects.toThrow(/^Select at least one course\.$/)
    // 503: a gateway (or the Vite dev proxy) answering because the backend isn't running.
    await expect(apiGet('/api/courses')).rejects.toThrow("Can't reach the CoursePilot server right now. Please try again in a moment.")
    await expect(apiGet('/api/courses')).rejects.toThrow('Something went wrong on the CoursePilot server. Please try again.')
    await expect(apiGet('/api/courses')).rejects.toThrow('Request failed with status 418.')
  })

  it('reads a 204 No Content response to the end so the browser does not cancel the request', async () => {
    // Regression: returning without reading the empty body made Chrome report every successful
    // DELETE as canceled (net::ERR_ABORTED). A plain object stands in for the response, because a
    // test Response with status 204 can't have the body stream that Chrome gives it.
    const text = vi.fn(async () => '')
    fetchMock.mockResolvedValue({ ok: true, status: 204, text } as unknown as Response)

    await expect(apiDelete('/api/schedules/saved/3', { auth: true })).resolves.toBeUndefined()
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
    expect(text).toHaveBeenCalledOnce()
  })

  it('ignores a trailing slash on VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://coursepilot-api.example.com/')
    vi.resetModules() // api.ts reads the variable when it is first imported
    const freshApi = await import('./api.ts')
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await freshApi.apiGet('/api/courses')

    expect(fetchMock.mock.calls[0][0]).toBe('https://coursepilot-api.example.com/api/courses')
  })
})
