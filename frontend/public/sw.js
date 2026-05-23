// frontend/public/sw.js

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// 1. Handle the incoming background push event from the backend scheduler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || "DayFlow Task Due! ⏰";
  const options = {
    body: data.body || `Your task "${data.taskTitle || 'Task'}" is scheduled for right now!`,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'task-deadline-alert', // Prevents notification stacking spam
    requireInteraction: true,   // Keeps the banner on screen until clicked
    data: {
      taskId: data.taskId,
      title: data.taskTitle || data.title
    }
  };

  // Only show the native system banner
  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Handle what happens when you click the system notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Instantly dimiss the system drawer item

  // Extract the original task data payload
  const notificationData = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Step A: Find your open DayFlow tab and bring it to the absolute front
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            
            // Step B: Once the tab is active and focused, fire the center pop-up trigger!
            const channel = new BroadcastChannel("push-notifications");
            channel.postMessage({
              type: "TASK_ALERT",
              taskId: notificationData.taskId,
              title: notificationData.title
            });
            channel.close();
            
            return focusedClient;
          });
        }
      }
      
      // Step C: If the application tab wasn't open, open a fresh window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});