import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Pencil, Printer, Download, Copy, FileText } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  body { font-family: "Times New Roman", Georgia, serif; font-size: 12pt; line-height: 1.5; color: #111; }
  h1 { font-size: 18pt; text-align: center; margin: 0 0 12pt; }
  h2 { font-size: 14pt; margin: 16pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 3pt; }
  h3 { font-size: 12.5pt; margin: 12pt 0 4pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10.5pt; page-break-inside: avoid; }
  th, td { border: 1px solid #666; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #eee; }
  ul, ol { margin: 4pt 0 4pt 18pt; }
  blockquote { border-left: 3px solid #999; margin: 8pt 0; padding-left: 10pt; color: #333; }
  code { font-family: Consolas, monospace; background: #f2f2f2; padding: 1pt 3pt; }
  pre { background: #f6f6f6; padding: 8pt; overflow: auto; }
`;

function buildHtml(title: string, bodyHtml: string) {
  return `<!DOCTYPE html><html lang="bg"><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`;
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function safeName(s: string) {
  return (s || "dokument").replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim().slice(0, 60) || "dokument";
}

export function EditableMarkdown({
  value,
  onChange,
  label,
  rows = 12,
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  rows?: number;
  title?: string;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const previewRef = useRef<HTMLDivElement>(null);
  const docTitle = title || label || "Документ";

  const html = () => previewRef.current?.innerHTML ?? "";

  const doPrint = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast.error("Разрешете изскачащи прозорци за печат");
    w.document.write(buildHtml(docTitle, html()));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground truncate">{label ?? "Съдържание (Markdown)"}</div>
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant={mode === "preview" ? "default" : "ghost"} onClick={() => setMode("preview")}>
            <Eye className="h-3.5 w-3.5" /> Преглед
          </Button>
          <Button type="button" size="sm" variant={mode === "edit" ? "default" : "ghost"} onClick={() => setMode("edit")}>
            <Pencil className="h-3.5 w-3.5" /> Редакция
          </Button>
          <div className="w-px bg-border mx-1" />
          <Button type="button" size="sm" variant="ghost" onClick={doPrint} title="Печат / PDF">
            <Printer className="h-3.5 w-3.5" /> Печат
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Свали като Word документ"
            onClick={() => download(`${safeName(docTitle)}.doc`, buildHtml(docTitle, html()), "application/msword")}
          >
            <FileText className="h-3.5 w-3.5" /> Word
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Свали като Markdown"
            onClick={() => download(`${safeName(docTitle)}.md`, value, "text/markdown;charset=utf-8")}
          >
            <Download className="h-3.5 w-3.5" /> .md
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => { navigator.clipboard.writeText(value); toast.success("Копирано"); }}
          >
            <Copy className="h-3.5 w-3.5" /> Копирай
          </Button>
        </div>
      </div>

      {/* Preview is always mounted (hidden in edit mode) so печат/Word винаги работят */}
      <div className={mode === "preview" ? "p-4 max-h-[65vh] overflow-auto" : "hidden"}>
        <div ref={previewRef} className="prose prose-sm max-w-none dark:prose-invert">
          <Markdown>{value || "_(празно)_"}</Markdown>
        </div>
      </div>
      {mode === "edit" && (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="font-mono text-xs min-h-[50vh] rounded-none border-0 focus-visible:ring-0"
        />
      )}
    </Card>
  );
}
