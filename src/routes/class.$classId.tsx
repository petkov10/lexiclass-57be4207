import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/class/$classId")({
  component: () => <Outlet />,
});
