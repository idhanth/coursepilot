// The JWT from POST /api/auth/login is kept in localStorage, so a page refresh doesn't log the user out.
// Any script running on this page can read localStorage, which is why the app never inserts untrusted HTML.

const TOKEN_KEY = 'coursepilot.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
