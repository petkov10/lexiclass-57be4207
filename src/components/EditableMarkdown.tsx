import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Pencil } from "lucide-react";
import { Markdown } from "@/components/Markdown";

export function EditableMarkdown({
  value,
  onChange,
  label,
  rows = 12,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  rows?: number;
}) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground truncate">{label ?? "Съдържание (Markdown)"}</div>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={mode === "edit" ? "default" : "ghost"} onClick={() => setMode("edit")}>
            <Pencil className="h-3.5 w-3.5" /> Редакция
          </Button>
          <Button type="button" size="sm" variant={mode === "preview" ? "default" : "ghost"} onClick={() => setMode("preview")}>
            <Eye className="h-3.5 w-3.5" /> Преглед
          </Button>
        </div>
      </div>
      {mode === "preview" ? (
        <div className="p-4 max-h-[60vh] overflow-auto">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{value || "_(празно)_"}</Markdown>
          </div>
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="font-mono text-xs rounded-none border-0 focus-visible:ring-0"
        />
      )}
    </Card>
  );
}
