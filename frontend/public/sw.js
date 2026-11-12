const CACHE = 'shafi-shell-v5'
const SHELL = ['/', '/manifest.webmanifest', '/logo.png', '/logo-mark.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

function cacheable(request) {
  if (request.method !== 'GET') return false
  if (request.mode === 'navigate') return false
  let url
  try {
    url = new URL(request.url)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return false
  if (request.destination === 'document') return false
  const accept = request.headers.get('accept') || ''
  if (accept.includes('text/html')) return false
  return true
}

self.addEventListener('fetch', (event) => {
  if (!cacheable(event.request)) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => undefined)
        }
        return response
      })
      .catch(() => caches.match(event.request)),
  )
})
