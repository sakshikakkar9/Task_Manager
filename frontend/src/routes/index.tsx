import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { useTasks } from "@/context/TaskContext";
import { TaskInput } from "@/components/TaskInput";
import { TaskCard } from "@/components/TaskCard";
import { StatsBar } from "@/components/StatsBar";
import { NotificationSettings } from "@/components/NotificationSettings";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DayFlow — Daily Planner & Task Manager" },
      {
        name: "description",
        content:
          "Plan your day, track deadlines, and build streaks with DayFlow's calm productivity workspace.",
      },
    ],
  }),
  component: PlannerPage,
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PlannerPage() {
  const { selectedDate, setDate, tasks, loading, error } = useTasks();

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks]);

  const shift = (days: number) => {
    const next = addDays(parseISO(selectedDate), days);
    setDate(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
    );
  };

  return (
    <div className="space-y-6">
      <StatsBar />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => shift(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-[14rem] text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Viewing
            </div>
            <div className="text-lg font-semibold">
              {format(parseISO(selectedDate), "EEEE, d MMMM yyyy")}
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={() => shift(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDate(todayStr())}>
          <CalendarDays className="mr-1 h-4 w-4" /> Today
        </Button>
      </div>

      <TaskInput />

      <NotificationSettings />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Tasks</h2>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Couldn't reach the API at http://localhost:5000/api — make sure your backend is running.
          </div>
        )}
        {!loading && !error && sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-muted-foreground">
            Nothing scheduled for this day. Add your first task above.
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {sorted.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
