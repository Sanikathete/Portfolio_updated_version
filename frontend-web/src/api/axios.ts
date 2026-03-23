import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import {
  FASTAPI_BASE_URL,
  DJANGO_BASE_URL,
  clearStoredAuth,
  getAccessToken,
  getStoredAuth,
} from './config'

export const djangoApi = axios.create({
  baseURL: DJANGO_BASE_URL,
})

export const fastApi = axios.create({
  baseURL: FASTAPI_BASE_URL,
})

function attachAuthHeaders(config: InternalAxiosRequestConfig) {
  const token = getAccessToken()

  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }

  return config
}

djangoApi.interceptors.request.use((config) => attachAuthHeaders(config))
fastApi.interceptors.request.use((config) => attachAuthHeaders(config))

function handleUnauthorized(error: unknown) {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    clearStoredAuth()
    window.location.href = '/login'
  }

  return Promise.reject(error)
}

djangoApi.interceptors.response.use((response) => response, handleUnauthorized)
fastApi.interceptors.response.use((response) => response, handleUnauthorized)

export type Stock = {
  id: number
  symbol: string
  name: string
  current_price: number | string | null
  currency?: string
  exchange?: string
  sector?: string
  updated_at?: string
}

export type PortfolioItem = {
  id: number
  stock: Stock
  quantity: number | string
  buy_price: number | string
  bought_at?: string
}

export type Portfolio = {
  id: number
  name: string
  items: PortfolioItem[]
  created_at?: string
}

export async function loginUser(username: string, password: string) {
  const response = await djangoApi.post('/api/users/login/', { username, password })
  return response.data as { access?: string; token?: string }
}

export async function fetchStocks() {
  const auth = getStoredAuth()

  if (!auth) {
    throw new Error('You need to log in first.')
  }

  const response = await fastApi.get('/data/stocks', {
    params: {
      username: auth.username,
      password: auth.password,
    },
  })

  return Array.isArray(response.data) ? (response.data as Stock[]) : []
}

export async function fetchPortfolio() {
  const auth = getStoredAuth()

  if (!auth) {
    throw new Error('You need to log in first.')
  }

  const response = await fastApi.get('/data/portfolio', {
    params: {
      username: auth.username,
      password: auth.password,
    },
  })

  return Array.isArray(response.data) ? (response.data as Portfolio[]) : []
}

export async function downloadReport(path: string, filename: string) {
  const response = await fastApi.get(path, {
    responseType: 'blob',
  })

  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
