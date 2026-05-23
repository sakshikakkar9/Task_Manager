// Global task state via Context + useReducer
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { api, type Task, type Stats } from "@/services/api";
import {
  registerServiceWorker,
  listenForServiceWorkerMessages,
} from "@/services/pushNotifications";

interface State {
  tasks: Task[];
  selectedDate: string; // YYYY-MM-DD
  loading: boolean;
  error: string | null;
  reminderOffset: number; // minutes
  stats: Stats | null;
  activeDeadlineTask: Task | null;
}

type Action =
  | { type: "SET_DATE"; date: string }
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; tasks: Task[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "ADD"; task: Task }
  | { type: "UPDATE"; task: Task }
  | { type: "REMOVE"; id: string }
  | { type: "SET_OFFSET"; offset: number }
  | { type: "SET_STATS"; stats: Stats }
  | { type: "SET_DEADLINE_TASK"; task: Task | null };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const initial: State = {
  tasks: [],
  selectedDate: todayStr(),
  loading: false,
  error: null,
  activeDeadlineTask: null,
  reminderOffset:
    typeof window !== "undefined"
      ? Number(localStorage.getItem("dayflow:offset") || 15)
      : 15,
  stats: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_DATE":
      return { ...state, selectedDate: action.date };
    case "LOAD_START":
      return { ...state, loading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, tasks: action.tasks };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };
    case "ADD":
      return { ...state, tasks: [...state.tasks, action.task] };
    case "UPDATE":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
        activeDeadlineTask: state.activeDeadlineTask?.id === action.task.id && action.task.completed ? null : state.activeDeadlineTask
      };
    case "REMOVE":
      return { 
        ...state, 
        // UPDATED: Safely filters using either standard id or MongoDB _id string comparison
        tasks: state.tasks.filter((t) => t.id !== action.id && (t as any)._id !== action.id),
        activeDeadlineTask: state.activeDeadlineTask?.id === action.id ? null : state.activeDeadlineTask
      };
    case "SET_OFFSET":
      return { ...state, reminderOffset: action.offset };
    case "SET_STATS":
      return { ...state, stats: action.stats };
    case "SET_DEADLINE_TASK":
      return { ...state, activeDeadlineTask: action.task };
  }
}

interface Ctx extends State {
  setDate: (d: string) => void;
  refresh: () => Promise<void>;
  createTask: (data: Parameters<typeof api.createTask>[0]) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setReminderOffset: (m: number) => void;
  refreshStats: () => Promise<void>;
  setActiveDeadlineTask: (task: Task | null) => void;
}

const TaskContext = createContext<Ctx | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  const refresh = useCallback(async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const tasks = await api.listTasks(state.selectedDate);
      dispatch({ type: "LOAD_SUCCESS", tasks });
    } catch (e) {
      dispatch({ type: "LOAD_ERROR", error: (e as Error).message });
    }
  }, [state.selectedDate]);

  const refreshStats = useCallback(async () => {
    try {
      const stats = await api.stats();
      dispatch({ type: "SET_STATS", stats });
    } catch (e) {
      // Backend may be offline; keep null
      console.warn("stats fetch failed", e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats, state.tasks.length]);

  // Service-worker based push notifications are used instead of local reminders
  useEffect(() => {
    registerServiceWorker();

    listenForServiceWorkerMessages(
      (taskId) => {
        const audio = new Audio("/beep.mp3");
        audio.play().catch(() => {});
      },
      (taskId) => {
        value.completeTask(taskId);
      }
    );
  }, []);

  const value: Ctx = {
    ...state,
    setDate: (date) => dispatch({ type: "SET_DATE", date }),
    refresh,
    createTask: async (data) => {
      const task = await api.createTask(data);
      dispatch({ type: "ADD", task });
    },
    completeTask: async (id) => {
      const task = await api.completeTask(id);
      dispatch({ type: "UPDATE", task });
    },
    deleteTask: async (id) => {
      // UPDATED: Destructure out and find the task context record to fallback on _id if id comes through as undefined
      const targetTask = state.tasks.find(t => t.id === id || (t as any)._id === id);
      const targetId = id && id !== "undefined" ? id : (targetTask ? ((targetTask as any)._id || targetTask.id) : id);

      await api.deleteTask(targetId);
      dispatch({ type: "REMOVE", id: targetId });
    },
    setReminderOffset: (m) => {
      localStorage.setItem("dayflow:offset", String(m));
      dispatch({ type: "SET_OFFSET", offset: m });
    },
    refreshStats,
    setActiveDeadlineTask: (task) => dispatch({ type: "SET_DEADLINE_TASK", task }),
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used inside TaskProvider");
  return ctx;
}