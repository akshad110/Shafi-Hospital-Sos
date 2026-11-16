import axios from 'axios'

const TOKEN_KEY = 'hos_access'
const FLAG_KEY = 'hos_in'

function store() {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function readAccessToken() {
  try {
    return store()?.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function writeAccessToken(token?: string) {
  try {
    const memory = store()
    if (token) {
      memory?.setItem(TOKEN_KEY, token)
      sessionStorage.removeItem(TOKEN_KEY)
      markSignedIn(true)
    } else {
      memory?.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    /* private browsing */
  }
}

export function markSignedIn(on: boolean) {
  try {
    if (on) localStorage.setItem(FLAG_KEY, '1')
    else localStorage.removeItem(FLAG_KEY)
  } catch {
    /* private browsing */
  }
}

export function wasSignedIn() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1'
  } catch {
    return false
  }
}

export const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  timeout: 20_000,
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
    if (error.response?.status === 401 && original && !original._retry && !url.includes('/auth/') && !url.includes('/admin/')) {
      if (!readAccessToken() && !wasSignedIn()) return Promise.reject(error)
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
