import axios from 'axios'

const TOKEN_KEY = 'hos_access'

export function readAccessToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function writeAccessToken(token?: string) {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing */
  }
}

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = readAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing: Promise<void> | null = null

export function refreshSession() {
  refreshing ||= client
    .post<{ accessToken?: string }>('/auth/refresh')
    .then((response) => {
      writeAccessToken(response.data.accessToken)
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const url = String(original?.url || '')
    if (error.response?.status === 401 && original && !original._retry && !url.includes('/auth/')) {
      original._retry = true
      try {
        await refreshSession()
        return client(original)
      } catch {
        writeAccessToken()
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  },
)
