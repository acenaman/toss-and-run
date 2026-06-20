import { createFileRoute } from "@tanstack/react-router";
import { HistoryScreen } from "@/components/history/HistoryScreen";

export const Route = createFileRoute("/_app/history")({
  component: HistoryScreen,
});
