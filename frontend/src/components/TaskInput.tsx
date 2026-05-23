// Task creation panel — title, date, time, priority, image
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/context/TaskContext";
import type { Priority } from "@/services/api";
import { toast } from "sonner";

const priorities: { value: Priority; label: string; classes: string }[] = [
  { value: "low", label: "Low", classes: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { value: "medium", label: "Medium", classes: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "high", label: "High", classes: "bg-red-100 text-red-700 border-red-300" },
];

export function TaskInput() {
  const { selectedDate, createTask } = useTasks();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("17:00");
  const [priority, setPriority] = useState<Priority>("medium");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPickImage(f: File | null) {
    setImage(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const deadline = new Date(`${date}T${time}`).toISOString();
      await createTask({ title: title.trim(), date, deadline, priority, image });
      setTitle("");
      onPickImage(null);
      toast.success("Task added");
    } catch (err) {
      toast.error("Couldn't create task. Is the API running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-card p-5 shadow-sm"
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What do you want to achieve today?"
        className="h-12 text-base"
      />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Deadline</label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-32"
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Priority</label>
          <div className="flex gap-1.5">
            {priorities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  priority === p.value
                    ? p.classes + " ring-2 ring-offset-1 ring-primary/40"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 text-xs font-medium text-muted-foreground">Image</label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mr-1 h-4 w-4" />
              {image ? "Change" : "Attach"}
            </Button>
            {preview && (
              <div className="relative">
                <img
                  src={preview}
                  alt="preview"
                  className="h-10 w-10 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => onPickImage(null)}
                  className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting || !title.trim()}
          className="ml-auto h-10"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Task
        </Button>
      </div>
    </motion.form>
  );
}
