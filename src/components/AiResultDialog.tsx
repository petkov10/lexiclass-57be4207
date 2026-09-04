import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditableMarkdown } from "@/components/EditableMarkdown";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** Общ прозорец за AI резултат в Markdown — с преглед, редакция, печат и сваляне. */
export function AiResultDialog({
  open,
  onOpenChange,
  title,
  loading,
  value,
  onChange,
  footer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  loading?: boolean;
  value: string;
  onChange: (v: string) => void;
  footer?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-16 grid place-items-center text-sm text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            AI подготвя материала…
          </div>
        ) : (
          <>
            <EditableMarkdown value={value} onChange={onChange} label={title} title={title} />
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              {footer}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Затвори</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
