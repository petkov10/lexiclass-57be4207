import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth, useRole } from "@/hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canEdit, loading: roleLoading } = useRole(user?.id);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || (user && roleLoading)) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Зареждане...</div>;
  }
  if (!user) return null;
  if (!canEdit) {
    return (
      <div className="min-h-screen grid place-items-center p-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Нямате достъп до администрацията</h1>
          <p className="text-muted-foreground mt-2">Свържете се с администратора на сайта.</p>
          <a href="/" className="mt-4 inline-block text-primary hover:underline">Към сайта</a>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
