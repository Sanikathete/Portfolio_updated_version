export const FASTAPI_BASE_URL = 'http://135.235.193.71:8001'
export const DJANGO_BASE_URL = 'http://135.235.193.71:8000'

export type StoredAuth = {
  accessToken: string
  username: string
  password: string
}

const AUTH_STORAGE_KEY = 'stocksphere_auth'

export function setStoredAuth(auth: StoredAuth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
}

export function getStoredAuth(): StoredAuth | null {
  const value = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as StoredAuth
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

export function getAccessToken() {
  return getStoredAuth()?.accessToken ?? null
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}
