// frontend/src/components/NotificationModal.tsx
import { useEffect, useState } from 'react';

export default function NotificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', body: '' });

  useEffect(() => {
    // Open up our communication channel receiver
    const channel = new BroadcastChannel('push-notifications');
    
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'TASK_ALERT') {
        setAlertData({
          title: event.data.title,
          body: event.data.body
        });
        setIsOpen(true); // This turns on the modal visibility!
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // If there's no incoming reminder active, display nothing
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Centered Modal Card Box */}
      <div className="w-full max-w-md scale-100 rounded-2xl bg-white border p-6 shadow-2xl text-center mx-4 dark:bg-gray-800 dark:border-gray-700">
        
        {/* Alarm Clock Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <span className="text-2xl animate-bounce">⏰</span>
        </div>

        {/* Dynamic Text Details */}
        <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          {alertData.title}
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {alertData.body}
        </p>

        {/* Dismiss Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition focus:outline-none"
        >
          Got it, Thanks!
        </button>
      </div>
    </div>
  );
}