import { clearToken, getToken } from './token.ts'

// Empty in development (Vite proxies /api); the backend's URL in production. A trailing slash is dropped,
// so "https://api.example.com/" doesn't turn "/api/courses" into "//api/courses".
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type RequestOptions = {
  // true for endpoints that need a logged-in user: the saved JWT is sent in the Authorization header.
  auth?: boolean
}

// AuthProvider registers a function here, so a rejected token logs the user out everywhere at once.
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

async function request<T>(path: string, init: RequestInit, { auth = false }: RequestOptions): Promise<T> {
  const headers = new Headers(init.headers)
  const token = auth ? getToken() : null
  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    // fetch itself failed: no network, or nothing is answering at the API address.
    throw new ApiError(0, "Can't reach the CoursePilot server. Check your connection and try again.")
  }

  if (!response.ok) {
    // 401 on a protected request means the token is missing, expired or invalid: forget it.
    // (A 401 from the login endpoint is just a wrong password, so it's not treated this way.)
    if (auth && response.status === 401) {
      clearToken()
      unauthorizedHandler?.()
    }
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new ApiError(response.status, errorMessage(body?.detail, response.status))
  }

  if (response.status === 204) {
    // No Content, e.g. after a delete. The empty body is still read to the end: if it is left unread,
    // Chrome cancels the request and shows a successful delete as failed (net::ERR_ABORTED).
    await response.text()
    return undefined as T
  }
  return response.json() as Promise<T>
}

// FastAPI errors look like {"detail": "Course not found."}, or, when the request fails validation,
// {"detail": [{"msg": "Value error, Select at least one course.", ...}]}.
function errorMessage(detail: unknown, status: number): string {
  if (typeof detail === 'string') {
    return detail
  }
  if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
    return detail[0].msg.replace(/^Value error, /, '')
  }
  if (status === 502 || status === 503 || status === 504) {
    // A gateway answered because the backend itself didn't: it isn't running, is restarting, or is too slow.
    // The Vite development proxy also answers 503 when the backend isn't running (see vite.config.ts).
    return "Can't reach the CoursePilot server right now. Please try again in a moment."
  }
  if (status >= 500) {
    return 'Something went wrong on the CoursePilot server. Please try again.'
  }
  return `Request failed with status ${status}.`
}

export function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, {}, options)
}

export function apiPost<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    options,
  )
}

export function apiDelete(path: string, options: RequestOptions = {}): Promise<void> {
  return request<void>(path, { method: 'DELETE' }, options)
}
