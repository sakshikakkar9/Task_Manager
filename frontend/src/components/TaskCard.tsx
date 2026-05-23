// Single task card with countdown, complete and delete actions
import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { CountdownTimer } from "./CountdownTimer";
import { Button } from "@/components/ui/button";
import { UPLOADS_BASE, type Task } from "@/services/api";
import { useTasks } from "@/context/TaskContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const priorityStyles: Record<Task["priority"], string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export const TaskCard = forwardRef<HTMLDivElement, { task: Task }>(
  ({ task }, ref) => {
    const { completeTask, deleteTask } = useTasks();
    const [busy, setBusy] = useState(false);
    const msLeft = new Date(task.deadline).getTime() - Date.now();
    const urgent = !task.completed && msLeft < 30 * 60_000 && msLeft > 0;

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className={`group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition ${
          task.completed
            ? "opacity-60"
            : urgent
              ? "border-destructive/60 ring-2 ring-destructive/20 animate-pulse"
              : "hover:shadow-md"
        }`}
      >
      {task.image && (
        <img
          src={`${UPLOADS_BASE}/${task.image}`}
          alt=""
          className="h-[60px] w-[60px] flex-shrink-0 rounded-lg object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={`text-base font-semibold text-foreground ${
              task.completed ? "line-through" : ""
            }`}
          >
            {task.title}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priorityStyles[task.priority]}`}
          >
            {task.priority}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{format(new Date(task.deadline), "h:mm a")}</span>
          {!task.completed && <CountdownTimer deadline={task.deadline} />}
          {task.completed && task.completedAt && (
            <span className="text-emerald-600">
              ✓ {format(new Date(task.completedAt), "h:mm a")}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!task.completed && (
          <motion.div whileTap={{ scale: 0.85 }}>
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await completeTask(task.id);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check className="mr-1 h-4 w-4" /> Done
            </Button>
          </motion.div>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                "{task.title}" will be removed permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTask(task.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      </motion.div>
    );
  },
);
