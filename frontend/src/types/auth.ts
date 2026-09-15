// These match the auth endpoints' JSON (backend/app/schemas/auth.py).

export type User = {
  id: number
  name: string
  email: string
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
}
