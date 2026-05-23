// Notification permission + reminder offset settings
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/context/TaskContext";
// Map subscribeToPush to the name requestPermissionAndSubscribe
import { subscribeToPush as requestPermissionAndSubscribe } from '../services/pushNotifications';

const offsets = [5, 10, 15, 30];

export function NotificationSettings() {
  const { reminderOffset, setReminderOffset } = useTasks();
  const [perm, setPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);

  async function enable() {
    try {
      await requestPermissionAndSubscribe(reminderOffset);
      setPerm(Notification.permission);
    } catch (err) {
      console.error(err);
      setPerm(Notification.permission);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            {perm === "granted" ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
            Reminders
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {perm === "granted"
              ? "Notifications are on. We'll ping you before each deadline."
              : perm === "denied"
                ? "Notifications blocked. Enable them in your browser settings."
                : "Allow notifications to get deadline reminders."}
          </p>
        </div>
        {perm !== "granted" && (
          <Button size="sm" onClick={enable} disabled={perm === "denied"}>
            Enable
          </Button>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Remind me before deadline
        </div>
        <div className="flex flex-wrap gap-2">
          {offsets.map((m) => (
            <button
              key={m}
              onClick={() => setReminderOffset(m)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                reminderOffset === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
