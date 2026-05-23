// Stats: today's completion ring, streak, all-time total
import { motion } from "framer-motion";
import { Flame, Trophy } from "lucide-react";
import { useTasks } from "@/context/TaskContext";

function Ring({ value }: { value: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
      <circle cx="32" cy="32" r={r} stroke="currentColor" strokeWidth="6" className="text-muted opacity-30" fill="none" />
      <motion.circle
        cx="32"
        cy="32"
        r={r}
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        className="text-primary"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

export function StatsBar() {
  const { stats, tasks } = useTasks();
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const rate = stats
    ? stats.todayTotal > 0
      ? Math.round((stats.todayCompleted / stats.todayTotal) * 100)
      : 0
    : total > 0
      ? Math.round((done / total) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="relative">
          <Ring value={rate} />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
            {rate}%
          </span>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Today</div>
          <div className="text-lg font-semibold">Completion rate</div>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
          <Flame className="h-7 w-7" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Streak</div>
          <div className="text-2xl font-bold">{stats?.streak ?? 0} day{stats?.streak === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Trophy className="h-7 w-7" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">All-time</div>
          <div className="text-2xl font-bold">{stats?.totalCompleted ?? 0} completed</div>
        </div>
      </div>
    </div>
  );
}
