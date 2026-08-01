import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classesQuery, settingsQuery } from "@/lib/queries";
import { PublicShell } from "@/components/layout/PublicShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { percentToGrade, gradeLabel, seededShuffle, DEFAULT_SCALE, type GradingScale } from "@/lib/grading";
import { ClipboardList, CheckCircle2, XCircle, ArrowLeft, ArrowRight, Send, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/test/$resourceId")({
  component: TestRunner,
  errorComponent: ({ error }) => (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">Грешка</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/">Към началото</Link></Button>
      </div>
    </PublicShell>
  ),
});

type Q = { q: string; type: "mc" | "open"; options?: string[] };

const STORAGE_KEY = (id: string) => `izvor:test:${id}`;

function TestRunner() {
  const { resourceId } = Route.useParams();
  const { data: classes } = useQuery(classesQuery);
  useQuery(settingsQuery);

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource-test", resourceId],
    queryFn: async () => {
      const [meta, payload] = await Promise.all([
        supabase
          .from("resources")
          .select("id, title, description, type, theme_id, theme:themes(id, name, class_id, subject_id, class:classes(name), subject:subjects(name))")
          .eq("id", resourceId)
          .maybeSingle(),
        // Answer keys never leave the server: this returns questions only.
        supabase.rpc("get_test_public", { _resource_id: resourceId }),
      ]);
      if (meta.error) throw meta.error;
      if (payload.error) throw payload.error;
      if (!meta.data) return null;
      return { ...meta.data, test: (payload.data as any) || {} };
    },
  });


  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [classId, setClassId] = useState("");
  const [attemptId, setAttemptId] = useState<string>("");
  const startedRef = useRef<number>(0);

  // Persisted student identity
  useEffect(() => {
    try {
      const raw = localStorage.getItem("izvor:student");
      if (raw) {
        const s = JSON.parse(raw);
        setStudentName(s.name || ""); setStudentNumber(s.number || ""); setClassId(s.classId || "");
      }
    } catch { /* */ }
  }, []);

  const content = ((resource as any)?.test as any) || {};
  const questions: Q[] = Array.isArray(content?.questions) ? content.questions : [];


  // Shuffled order (stable per attempt)
  const shuffled = useMemo(() => {
    if (!attemptId || questions.length === 0) return questions;
    const ordered = seededShuffle(questions.map((q, i) => ({ ...q, _origIndex: i })), attemptId);
    return ordered.map((q) => ({
      ...q,
      options: q.type === "mc" && q.options ? seededShuffle(q.options, attemptId + (q as any)._origIndex) : q.options,
    }));
  }, [questions, attemptId]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: number; max: number; percent: number; grade: number; details: any[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Restore mid-progress answers
  useEffect(() => {
    if (phase !== "running" || !attemptId) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(attemptId));
      if (raw) {
        const s = JSON.parse(raw);
        setAnswers(s.answers || {});
        setIdx(s.idx || 0);
      }
    } catch { /* */ }
  }, [phase, attemptId]);

  useEffect(() => {
    if (phase !== "running" || !attemptId) return;
    localStorage.setItem(STORAGE_KEY(attemptId), JSON.stringify({ answers, idx }));
  }, [answers, idx, phase, attemptId]);

  const start = () => {
    if (!studentName.trim()) return toast.error("Моля въведете име");
    localStorage.setItem("izvor:student", JSON.stringify({ name: studentName, number: studentNumber, classId }));
    const id = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2);
    setAttemptId(id);
    startedRef.current = Date.now();
    setAnswers({});
    setIdx(0);
    setResult(null);
    setPhase("running");
  };

  const submit = async () => {
    if (!resource) return;
    setSubmitting(true);
    try {
      // Rebuild answers in the ORIGINAL question order for server-side grading.
      const given: string[] = new Array(questions.length).fill("");
      shuffled.forEach((q, i) => {
        const orig = (q as any)._origIndex ?? i;
        given[orig] = answers[i] ?? "";
      });
      const cls = classes?.find((c) => c.id === classId);

      const { data, error } = await supabase.rpc("submit_test_attempt", {
        _resource_id: resource.id,
        _student_name: studentName.trim(),
        _student_number: (studentNumber.trim() || null) as any,
        _student_class: (cls?.name || null) as any,
        _class_id: (classId || null) as any,

        _given: given as any,
        _duration_seconds: Math.max(1, Math.round((Date.now() - startedRef.current) / 1000)),
      });
      if (error) throw error;
      const r = data as any;
      setResult({
        score: r?.score ?? 0,
        max: r?.max_score ?? 0,
        percent: Number(r?.percent ?? 0),
        grade: Number(r?.grade ?? 0),
        details: Array.isArray(r?.details) ? r.details : [],
      });
      localStorage.removeItem(STORAGE_KEY(attemptId));
      setPhase("done");
    } catch (e: any) {
      toast.error(e.message || "Грешка при предаване");
    } finally {
      setSubmitting(false);
    }
  };


  if (isLoading) {
    return <PublicShell><div className="max-w-2xl mx-auto p-10"><div className="h-40 bg-muted animate-pulse rounded" /></div></PublicShell>;
  }
  if (!resource || resource.type !== "test" || questions.length === 0) {
    return (
      <PublicShell>
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <h1 className="text-xl font-semibold">Тестът не е наличен</h1>
          <p className="mt-2 text-sm text-muted-foreground">Възможно е да е премахнат или още да не съдържа въпроси.</p>
        </div>
      </PublicShell>
    );
  }

  // INTRO
  if (phase === "intro") {
    return (
      <PublicShell>
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
          <div className="text-center">
            <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary grid place-items-center mx-auto"><ClipboardList className="h-7 w-7" /></div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">{resource.title}</h1>
            {(resource as any).theme && (
              <p className="text-sm text-muted-foreground mt-1">
                {(resource as any).theme.class?.name} · {(resource as any).theme.subject?.name} · {(resource as any).theme.name}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">{questions.length} въпроса</p>
          </div>
          <Card className="p-5 space-y-3">
            <div><Label>Име и фамилия *</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Иван Иванов" autoFocus /></div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <div>
                <Label>Клас</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger><SelectValue placeholder="Изберете" /></SelectTrigger>
                  <SelectContent>{(classes ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>№ в клас</Label><Input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="12" inputMode="numeric" /></div>
            </div>
            <Button onClick={start} className="w-full" size="lg" disabled={!studentName.trim()}>Започни теста</Button>
            <p className="text-xs text-muted-foreground text-center">Въпросите ще бъдат разбъркани. Отговорите ви се запазват автоматично.</p>
          </Card>
        </div>
      </PublicShell>
    );
  }

  // DONE
  if (phase === "done" && result) {
    return (
      <PublicShell>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <Card className="p-6 text-center space-y-2">
            <div className="text-sm text-muted-foreground">Резултат за {studentName}</div>
            <div className="text-5xl font-bold tracking-tight text-primary">{result.grade.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">{gradeLabel(result.grade)} · {result.score}/{result.max} верни · {result.percent}%</div>
          </Card>
          <div className="space-y-3">
            <h2 className="font-semibold">Преглед на отговорите</h2>
            {result.details.map((d, i) => (
              <Card key={i} className={`p-4 border-l-4 ${d.correct ? "border-l-emerald-500" : d.type === "open" ? "border-l-amber-500" : "border-l-rose-500"}`}>
                <div className="flex items-start gap-2">
                  {d.type === "mc" ? (d.correct ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />) : <ClipboardList className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0 text-sm">
                    <div className="font-medium">{i + 1}. {d.q}</div>
                    <div className="mt-2 grid grid-cols-1 gap-1">
                      <div><span className="text-muted-foreground">Вашият отговор:</span> {d.given || <em>(няма)</em>}</div>
                      {d.type === "mc" && <div><span className="text-muted-foreground">Верен:</span> <span className="text-emerald-600 dark:text-emerald-400 font-medium">{d.expected}</span></div>}
                      {d.explanation && <div className="text-xs text-muted-foreground mt-1">{d.explanation}</div>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => { setPhase("intro"); setResult(null); }}><RefreshCw /> Нов опит</Button>
            <Button asChild><Link to="/">Към началото</Link></Button>
          </div>
        </div>
      </PublicShell>
    );
  }

  // RUNNING
  const q = shuffled[idx];
  const answeredCount = Object.values(answers).filter((v) => v && v.length > 0).length;
  return (
    <PublicShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">{studentName}{studentNumber ? ` · №${studentNumber}` : ""}</div>
          <div className="text-muted-foreground">Отговорени {answeredCount}/{shuffled.length}</div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / shuffled.length) * 100}%` }} />
        </div>
        <Card className="p-6 space-y-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Въпрос {idx + 1} от {shuffled.length}</div>
          <div className="text-lg font-medium whitespace-pre-wrap">{q.q}</div>
          {q.type === "mc" ? (
            <div className="space-y-2">
              {(q.options ?? []).map((opt) => {
                const selected = answers[idx] === opt;
                return (
                  <button key={opt} onClick={() => setAnswers((p) => ({ ...p, [idx]: opt }))}
                    className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`h-4 w-4 rounded-full border-2 grid place-items-center ${selected ? "border-primary" : "border-muted-foreground/30"}`}>
                        {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <div>{opt}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              rows={4}
              value={answers[idx] ?? ""}
              onChange={(e) => setAnswers((p) => ({ ...p, [idx]: e.target.value }))}
              placeholder="Вашият отговор..."
              className="w-full rounded-lg border bg-background p-3 text-sm"
            />
          )}
        </Card>
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}><ArrowLeft /> Назад</Button>
          {idx < shuffled.length - 1 ? (
            <Button onClick={() => setIdx((i) => i + 1)}>Напред <ArrowRight /></Button>
          ) : (
            <Button onClick={submit} disabled={submitting}><Send /> {submitting ? "Предаване..." : "Предай теста"}</Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center pt-2">
          {shuffled.map((_, i) => {
            const a = answers[i];
            return (
              <button key={i} onClick={() => setIdx(i)} className={`h-8 w-8 rounded text-xs font-medium ${i === idx ? "bg-primary text-primary-foreground" : a ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</button>
            );
          })}
        </div>
      </div>
    </PublicShell>
  );
}
