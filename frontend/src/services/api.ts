// Empty in development (Vite proxies /api); the backend's URL in production.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError(0, 'The CoursePilot server is unavailable.')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    throw new ApiError(response.status, errorMessage(body?.detail, response.status))
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
  if (status >= 500) {
    // Includes the development proxy's response when the backend isn't running.
    return "The CoursePilot server couldn't complete the request. Please try again."
  }
  return `Request failed with status ${status}.`
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
