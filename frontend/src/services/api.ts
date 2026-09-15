// Empty in development (Vite proxies /api); the backend's URL in production.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`)
  } catch {
    throw new ApiError(0, 'The CoursePilot server is unavailable.')
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed with status ${response.status}.`)
  }
  return response.json() as Promise<T>
}
