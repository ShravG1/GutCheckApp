/* GutCheck — service worker notification handling.
   Imported into the generated Workbox service worker. */

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            client.postMessage({ type: 'notification-click', url })
            return
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url)
      }),
  )
})
