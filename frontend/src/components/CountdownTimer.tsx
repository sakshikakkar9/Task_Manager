// Live countdown to a deadline; turns urgent under 30 min
import { useEffect, useState } from "react";

interface Props {
  deadline: string;
  className?: string;
}

function format(ms: number) {
  if (ms <= 0) return "Overdue";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s left`;
}

export function CountdownTimer({ deadline, className = "" }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ms = new Date(deadline).getTime() - now;
  const urgent = ms < 30 * 60_000 && ms > 0;
  const overdue = ms <= 0;
  return (
    <span
      className={`text-sm font-medium tabular-nums ${
        overdue
          ? "text-destructive"
          : urgent
            ? "text-destructive animate-pulse"
            : "text-muted-foreground"
      } ${className}`}
    >
      {format(ms)}
    </span>
  );
}
