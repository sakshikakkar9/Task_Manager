// frontend/src/components/RecordsSection.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, UPLOADS_BASE, type Task, type DayRecord } from "@/services/api";

type Filter = "all" | "week" | "month";

const priorityStyles: Record<Task["priority"], string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export function RecordsSection() {
  const [filter, setFilter] = useState<Filter>("all");
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // CRITICAL HYDRATION FIX: Track whether the component has mounted inside the browser DOM
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Tells React it is safe to inject browser-specific data loops
    let cancel = false;
    setLoading(true);
    setError(null);
    
    api
      .records(filter)
      .then((r) => {
        if (!cancel) setRecords(r || []);
      })
      .catch((e) => !cancel && setError(e.message))
      .finally(() => !cancel && setLoading(false));
      
    return () => {
      cancel = true;
    };
  }, [filter]);

  // If we are Server-Side Rendering (SSR), render a placeholder shell layout shell
  // This guarantees the server HTML structure matches the browser's starting point perfectly.
  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Records</h2>
        </div>
        <p className="text-sm text-muted-foreground">Loading records…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Records</h2>
        <div className="flex gap-1 rounded-full border bg-card p-1">
          {(["all", "week", "month"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All time" : `This ${f}`}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading records…</p>}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Couldn't load records: {error}
        </p>
      )}
      {!loading && !error && records.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
          No completed tasks yet. Get something done today!
        </div>
      )}

      {/* FIX: Map over the valid records state array safely */}
      {records.map((record, recordIdx) => {
        const tasks = record.tasks || [];
        const totalTasks = tasks.length;
        const completedCount = tasks.filter((t) => t.completed).length;
        
        // Safely evaluate dates inside the client space
        const displayDate = record.date 
          ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          : `Session #${recordIdx + 1}`;

        return (
          <motion.section
            key={record.id || `record-${recordIdx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">
                {displayDate}
              </h3>
              <span className="text-sm text-muted-foreground">
                {completedCount} of {totalTasks} completed
              </span>
            </div>
            <ul className="space-y-2">
              {tasks.map((t, taskIdx) => (
                <li
                  key={t.id || `task-${recordIdx}-${taskIdx}`}
                  className="flex items-center gap-3 rounded-lg border bg-background p-3"
                >
                  {t.image && (
                    <img
                      src={`${UPLOADS_BASE}/${t.image}`}
                      alt=""
                      className="h-[60px] w-[60px] rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.title}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[t.priority] || "bg-gray-100 text-gray-700"}`}
                      >
                        {t.priority}
                      </span>
                    </div>
                    {t.completedAt && (
                      <div className="text-xs text-muted-foreground">
                        Completed at {new Date(t.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.section>
        );
      })}
    </div>
  );
}