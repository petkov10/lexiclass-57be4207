import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode, Download, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function QrCodeButton({ url, label = "QR", title }: { url: string; label?: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "M" })
      .then(setDataUrl)
      .catch(() => toast.error("Грешка при генериране на QR код"));
  }, [open, url]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}>
        <QrCode className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{title || "QR код за теста"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {dataUrl ? (
              <img src={dataUrl} alt="QR" className="w-full rounded border bg-white p-2" />
            ) : (
              <div className="aspect-square bg-muted animate-pulse rounded" />
            )}
            <div className="text-xs text-muted-foreground break-all bg-muted rounded p-2">{url}</div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success("Линкът е копиран"); }}>
                <Copy className="h-4 w-4" /> Копирай
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Отвори</a>
              </Button>
              <Button size="sm" variant="outline" disabled={!dataUrl} onClick={() => {
                const a = document.createElement("a");
                a.href = dataUrl; a.download = `qr-${Date.now()}.png`; a.click();
              }}>
                <Download className="h-4 w-4" /> PNG
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
