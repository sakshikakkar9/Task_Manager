// Push notification service for DayFlow frontend
// Handles SW registration, permission request, and subscription

const API_BASE = 'http://localhost:5000/api'

// Your VAPID public key from .env — frontend needs the PUBLIC key only
// This must match VAPID_PUBLIC_KEY in your backend .env
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service workers not supported in this browser')
    return null
  }
  try {
    // CRITICAL: register from /sw.js (root), NOT /src/sw.js
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    console.log('[Push] Service worker registered, scope:', reg.scope)

    // Wait for the SW to be ready and active
    await navigator.serviceWorker.ready
    console.log('[Push] Service worker is active and ready')
    return reg
  } catch (err) {
    console.error('[Push] Service worker registration failed:', err)
    return null
  }
}

export async function subscribeToPush(): Promise<void> {
  const reg = await registerServiceWorker();
  if (!reg) return;

  try {
    if (!VAPID_PUBLIC_KEY) {
      console.error("[Push] VAPID key missing from environment variables. Check your frontend .env file.");
      return;
    }

    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      console.log("[Push] Generating brand new subscription token...");
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    console.log("[Push] Browser subscription token ready:", sub.toJSON());

    // --- CRITICAL FIX: Matches the exact nested schema your backend route expects ---
    const payloadBody = {
      subscription: sub.toJSON(), // Wraps endpoint and keys inside "subscription"
      reminderOffsetMinutes: 0,   // Triggers reminders right at the deadline minute
      beepEnabled: true
    };

    console.log("[Push] Sending payload mapping to backend:", payloadBody);

    const response = await fetch(`${API_BASE}/push/subscribe`, { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloadBody),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Server responded with status: ${response.status}`);
    }

    console.log("🟢 [Push] Success! Subscription verified and saved into MongoDB.");
  } catch (e) {
    console.error("❌ Push subscription registration failed:", e);
  }
}

// Local fallback: schedule notifications via setTimeout while tab is open
const scheduled = new Map<string, number>();

export function scheduleLocalReminder(
  taskId: string,
  taskTitle: string,
  deadlineISO: string,
  offsetMinutes: number,
) {
  cancelLocalReminder(taskId);
  const fireAt = new Date(deadlineISO).getTime() - offsetMinutes * 60_000;
  const delay = fireAt - Date.now();
  if (delay <= 0) return;
  const id = window.setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification(taskTitle, {
        body: `Due in ${offsetMinutes} minutes!`,
        icon: "/icon.png",
      });
    }
    scheduled.delete(taskId);
  }, delay);
  scheduled.set(taskId, id);

  // Also schedule a "Deadline reached" notification
  const deadlineAt = new Date(deadlineISO).getTime();
  const deadlineDelay = deadlineAt - Date.now();
  if (deadlineDelay > 0) {
    const dId = window.setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(taskTitle, {
          body: "Deadline reached!",
          icon: "/icon.png",
        });
      }
      scheduled.delete(`${taskId}-deadline`);
    }, deadlineDelay);
    scheduled.set(`${taskId}-deadline`, dId);
  }
}

export function cancelLocalReminder(taskId: string) {
  const id = scheduled.get(taskId);
  if (id) {
    clearTimeout(id);
    scheduled.delete(taskId);
  }
  const dId = scheduled.get(`${taskId}-deadline`);
  if (dId) {
    clearTimeout(dId);
    scheduled.delete(`${taskId}-deadline`);
  }
}

// Listen for messages sent from the Service Worker to the frontend
export function listenForServiceWorkerMessages(onMessageReceived: (data: any) => void) {
  if (!('serviceWorker' in navigator)) return () => {};

  const handleMessage = (event: MessageEvent) => {
    if (event.data) {
      console.log('[Push] Message received from Service Worker:', event.data);
      onMessageReceived(event.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}

// =========================================================================
// 🟢 AUTOMATED DEVELOPMENT HOOK: Fires 2 seconds after the script executes
// =========================================================================
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    console.log("🚀 [Auto-Run] Initiating automated background registration...");
    try {
      await subscribeToPush();
    } catch (err) {
      console.error("❌ Auto-run execution failed:", err);
    }
  }, 2000); 
}