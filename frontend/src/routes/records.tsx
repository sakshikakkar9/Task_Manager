import { createFileRoute } from "@tanstack/react-router";
import { RecordsSection } from "@/components/RecordsSection";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Records — DayFlow" },
      {
        name: "description",
        content:
          "Browse your completed tasks history grouped by day with weekly and monthly filters.",
      },
    ],
  }),
  component: () => <RecordsSection />,
});
