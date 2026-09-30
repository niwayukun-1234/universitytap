import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { TimetableView } from "@/components/timetable-view";

export const Route = createFileRoute("/app/timetable")({
  component: TT,
});

function TT() {
  const { user } = useAuth();
  if (!user) return null;
  return <TimetableView userId={user.id} editable />;
}