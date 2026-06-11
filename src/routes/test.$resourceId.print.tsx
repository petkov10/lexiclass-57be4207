import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";

export const Route = createFileRoute("/test/$resourceId/print")({
  component: PrintTest,
});

function PrintTest() {
  const { resourceId } = Route.useParams();
  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource-print", resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, description, type, content, theme:themes(name, class:classes(name), subject:subjects(name))")
        .eq("id", resourceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="p-10">Зареждане...</div>;
  if (!resource || resource.type !== "test") return <div className="p-10">Тестът не е намерен.</div>;
  const c = resource.content as any;
  const questions: any[] = c?.questions ?? [];
  const t = (resource as any).theme;

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`@media print { .no-print { display:none !important; } body { background:white; } .page-break { page-break-before: always; } }`}</style>
      <div className="no-print sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between gap-3 print:hidden">
        <div className="text-sm text-muted-foreground">Изглед за принтиране</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Принтирай / Запази PDF</Button>
          <Button size="sm" variant="outline" onClick={() => downloadHtml(resource, questions)}><FileDown className="h-4 w-4" /> Свали HTML</Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10 space-y-8 print:py-4">
        <header className="border-b pb-4">
          <h1 className="text-2xl font-bold">{c?.title || resource.title}</h1>
          {t && <p className="text-sm text-gray-600 mt-1">{t.class?.name} · {t.subject?.name} · {t.name}</p>}
          <div className="mt-4 text-sm grid grid-cols-2 gap-2">
            <div>Име: ____________________________</div>
            <div>№ в клас: _______</div>
            <div>Клас: ____________</div>
            <div>Дата: _____________</div>
          </div>
        </header>

        <ol className="space-y-5 list-decimal pl-6">
          {questions.map((q, i) => (
            <li key={i} className="space-y-2">
              <div className="font-medium">{q.q}</div>
              {q.type === "mc" ? (
                <ul className="space-y-1 ml-2 list-none">
                  {(q.options ?? []).map((o: string, j: number) => (
                    <li key={j}>○ {o}</li>
                  ))}
                </ul>
              ) : (
                <div className="border-b border-dashed border-gray-400 h-16" />
              )}
            </li>
          ))}
        </ol>

        <div className="page-break" />

        <section>
          <h2 className="text-xl font-bold border-b pb-2">Отговори (за учителя)</h2>
          <ol className="mt-4 space-y-2 list-decimal pl-6 text-sm">
            {questions.map((q, i) => (
              <li key={i}>
                <strong>{q.answer}</strong>
                {q.explanation && <span className="text-gray-600"> — {q.explanation}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function downloadHtml(resource: any, questions: any[]) {
  const c = resource.content || {};
  const html = `<!doctype html><html lang="bg"><head><meta charset="utf-8"><title>${escape(resource.title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:780px;margin:2rem auto;padding:0 2rem;color:#111}h1{margin:0}ol{padding-left:1.5rem}li{margin:.75rem 0}.line{border-bottom:1px dashed #888;height:3rem;margin:.25rem 0}</style>
</head><body>
<h1>${escape(c.title || resource.title)}</h1>
<p>Име: ____________________  №: ____  Клас: ____  Дата: ____</p>
<ol>${questions.map(q => `<li><div><strong>${escape(q.q)}</strong></div>${q.type === "mc" ? `<ul>${(q.options || []).map((o: string) => `<li>○ ${escape(o)}</li>`).join("")}</ul>` : `<div class="line"></div>`}</li>`).join("")}</ol>
<hr><h2>Отговори</h2><ol>${questions.map(q => `<li><strong>${escape(q.answer)}</strong>${q.explanation ? ` — ${escape(q.explanation)}` : ""}</li>`).join("")}</ol>
</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${(resource.title || "test").replace(/[^a-z0-9_-]+/gi, "_")}.html`; a.click();
  URL.revokeObjectURL(url);
}

function escape(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}
