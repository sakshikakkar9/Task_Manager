// REST API client for DayFlow backend
const API_BASE = "http://localhost:5000/api";
export const UPLOADS_BASE = "http://localhost:5000/uploads";

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  deadline: string; // ISO datetime
  priority: Priority;
  image?: string | null;
  completed: boolean;
  completedAt?: string | null;
}

export interface DayRecord {
  id: string;
  date: string;
  displayDate: string;
  tasks: Task[];
  totalTasks: number;
  completedCount: number;
}


export interface Stats {
  streak: number;
  totalCompleted: number;
  todayCompleted: number;
  todayTotal: number;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  listTasks: (date: string) =>
    fetch(`${API_BASE}/tasks?date=${date}`).then(handle<Task[]>),

  createTask: (data: {
    title: string;
    date: string;
    deadline: string;
    priority: Priority;
    image?: File | null;
  }) => {
    const fd = new FormData();
    fd.append("title", data.title);
    fd.append("date", data.date);
    fd.append("deadline", data.deadline);
    fd.append("priority", data.priority);
    if (data.image) fd.append("image", data.image);
    return fetch(`${API_BASE}/tasks`, { method: "POST", body: fd }).then(handle<Task>);
  },

  completeTask: (id: string) =>
    fetch(`${API_BASE}/tasks/${id}/complete`, { method: "PATCH" }).then(handle<Task>),

  deleteTask: (id: string) =>
    fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" }).then((r) => {
      if (!r.ok) throw new Error("Delete failed");
    }),

  records: (filter: "all" | "week" | "month") =>
    fetch(`${API_BASE}/records?filter=${filter}`)
      .then(handle<{ data: DayRecord[] }>)
      .then((r) => r.data),

  subscribePush: (sub: PushSubscriptionJSON) =>
    fetch(`${API_BASE}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    }).then((r) => {
      if (!r.ok) throw new Error("Subscribe failed");
    }),

  stats: () => fetch(`${API_BASE}/stats`).then(handle<Stats>),
};
