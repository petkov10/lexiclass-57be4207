import { useEffect, useRef, useState } from "react";
import { verifyAccessPin } from "@/lib/access-gate.functions";
import { useAccessMode, isGatePassed, markGatePassed } from "@/hooks/useAccessGate";
import { useAuth, useRole } from "@/hooks/useAuth";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { Delete } from "lucide-react";

const PUBLIC_PREFIXES = ["/auth", "/admin"];

export function PinGate({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading: authLoading } = useAuth();
  const { canEdit, loading: roleLoading } = useRole(user?.id);
  const mode = useAccessMode();
  const [passed, setPassed] = useState<boolean>(() => isGatePassed());

  // Bypass for admin routes (own auth) and /auth itself
  const skip = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  // Refresh local state when sessionStorage changes within the tab
  useEffect(() => {
    if (isGatePassed()) setPassed(true);
  }, [pathname]);

  if (skip) return <>{children}</>;
  if (mode === null || authLoading || (user && roleLoading)) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Зареждане…</div>;
  }
  if (mode === "free" || passed) return <>{children}</>;
  // Logged-in admins/editors bypass PIN
  if (user && canEdit) return <>{children}</>;

  return <PinScreen mode={mode} onPass={() => setPassed(true)} />;
}

function PinScreen({ mode, onPass }: { mode: "global_pin" | "user_pin"; onPass: () => void }) {
  const { data: settings } = useQuery(settingsQuery);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const checked = useRef<string>("");

  const append = (d: string) => {
    if (pin.length >= 4 || checking) return;
    setError(null);
    setPin((p) => (p + d).slice(0, 4));
  };
  const back = () => { setError(null); setPin((p) => p.slice(0, -1)); };

  // Auto-verify when 4 digits
  useEffect(() => {
    if (pin.length !== 4 || checked.current === pin) return;
    checked.current = pin;
    setChecking(true);
    verifyAccessPin({ data: { pin } })
      .then((res) => {
        setChecking(false);
        if (res?.ok) {
          markGatePassed(res.user);
          onPass();
        } else {
          setError("Грешен PIN. Опитай отново.");
          setTimeout(() => { setPin(""); checked.current = ""; }, 600);
        }
      })
      .catch(() => {
        setChecking(false);
        setError("Грешка при проверката. Опитай отново.");
        setTimeout(() => { setPin(""); checked.current = ""; }, 600);
      });
  }, [pin, onPass]);

  // Physical keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") append(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const keys = ["1","2","3","4","5","6","7","8","9"];
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-2xl font-bold shadow-lg">
            {(settings?.logo_text || settings?.site_name || "L").slice(0, 1).toUpperCase()}
          </div>
          <h1 className="mt-4 text-xl font-semibold">Въведи PIN код</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "global_pin" ? "За достъп до ресурсите" : "Личният ти 4-цифрен код"}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          {[0,1,2,3].map((i) => (
            <div key={i}
              className={`h-14 w-12 rounded-xl border-2 grid place-items-center text-2xl font-bold transition-all ${
                pin.length > i ? "border-primary bg-primary/10" : "border-border bg-card"
              } ${error ? "border-destructive animate-pulse" : ""}`}>
              {pin[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {checking && <p className="text-sm text-muted-foreground">Проверка…</p>}

        <div className="grid grid-cols-3 gap-3">
          {keys.map((k) => (
            <button key={k} type="button" onClick={() => append(k)}
              className="h-16 rounded-2xl bg-card border text-2xl font-semibold hover:bg-accent active:scale-95 transition-all shadow-sm">
              {k}
            </button>
          ))}
          <div />
          <button type="button" onClick={() => append("0")}
            className="h-16 rounded-2xl bg-card border text-2xl font-semibold hover:bg-accent active:scale-95 transition-all shadow-sm">0</button>
          <button type="button" onClick={back}
            className="h-16 rounded-2xl bg-muted text-muted-foreground grid place-items-center hover:bg-accent active:scale-95 transition-all">
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
