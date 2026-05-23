// frontend/src/routes/__root.tsx
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Home, ListChecks, AlertCircle } from "lucide-react";
import { TaskProvider, useTasks } from "@/context/TaskContext";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DayFlow — Daily Planner" },
      {
        name: "description",
        content:
          "DayFlow is a calm daily planner that tracks tasks, deadlines, achievements and streaks.",
      },
      { name: "author", content: "DayFlow" },
      { property: "og:title", content: "DayFlow — Daily Planner" },
      {
        property: "og:description",
        content: "Plan your day and build a winning streak.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "DayFlow — Daily Planner" },
      { name: "description", content: "DayFlow is a daily task manager and planner that tracks your progress and achievements." },
      { property: "og:description", content: "DayFlow is a daily task manager and planner that tracks your progress and achievements." },
      { name: "twitter:description", content: "DayFlow is a daily task manager and planner that tracks your progress and achievements." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d8be6e80-f110-4a60-9e53-a8768bc28542/id-preview-ecfd1acf--8033b802-94ee-4e71-8f20-58d0b62b0945.lovable.app-1779029277906.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d8be6e80-f110-4a60-9e53-a8768bc28542/id-preview-ecfd1acf--8033b802-94ee-4e71-8f20-58d0b62b0945.lovable.app-1779029277906.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navItems = [
  { to: "/", label: "Today", icon: Home },
  { to: "/records", label: "Records", icon: ListChecks },
] as const;

function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card/60 backdrop-blur md:flex md:flex-col">
      <div className="px-6 py-7">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            D
          </div>
          <div>
            <div className="text-base font-bold leading-none">DayFlow</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Daily Planner
            </div>
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            activeProps={{
              className:
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold bg-primary/10 text-primary",
            }}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground"
            activeProps={{
              className:
                "flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold text-primary",
            }}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function DeadlineAlert() {
  const { activeDeadlineTask, setActiveDeadlineTask, completeTask } = useTasks();

  if (!activeDeadlineTask) return null;

  return (
    <AlertDialog open={!!activeDeadlineTask} onOpenChange={(open) => !open && setActiveDeadlineTask(null)}>
      <AlertDialogContent className="max-w-[400px]">
        <AlertDialogHeader>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <AlertDialogTitle className="text-center">Deadline Reached!</AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            "{activeDeadlineTask.title}" is due now. Have you completed it?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={async () => {
              await completeTask(activeDeadlineTask.id);
              setActiveDeadlineTask(null);
            }}
            className="flex-1"
          >
            Mark as Done
          </AlertDialogAction>
          <AlertDialogAction
            onClick={() => setActiveDeadlineTask(null)}
            className="flex-1 bg-muted text-muted-foreground hover:bg-muted/80"
          >
            Dismiss
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Inner Content component safely wrapped inside our context tree layers
// Inner Content component safely wrapped inside our context tree layers
function RootContent() {
  const { setActiveDeadlineTask } = useTasks();

  useEffect(() => {
    // Listen directly to the Service Worker's broadcast channel
    const channel = new BroadcastChannel("push-notifications");

    channel.onmessage = (event) => {
      if (event.data && event.data.type === "TASK_ALERT") {
        // Sets state instantly in the background so the modal mounts
        setActiveDeadlineTask({
          id: event.data.taskId || "pushed-alert",
          title: event.data.title,
          date: "",
          deadline: "",
          priority: "high",
          completed: false
        });
      }
    };

    return () => {
      channel.close();
    };
  }, [setActiveDeadlineTask]);

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-8">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TaskProvider>
        <DeadlineAlert />
        <RootContent />
        <Toaster position="top-center" />
      </TaskProvider>
    </QueryClientProvider>
  );
}