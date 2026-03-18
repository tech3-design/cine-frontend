"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { triggerExport, getExportStatus, getExportDownloadUrl } from "@/lib/api";
import { toast } from "sonner";
import type { ExportStatus } from "@/lib/types";

interface ExportButtonProps {
  projectId: string;
  readyClipCount: number;
}

export function ExportButton({ projectId, readyClipCount }: ExportButtonProps) {
  const [exportId, setExportId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [polling, setPolling] = useState(false);

  const startExport = useCallback(async () => {
    if (readyClipCount === 0) {
      toast.error("No ready clips to export");
      return;
    }
    try {
      const res = await triggerExport(projectId);
      setExportId(res.export_id);
      setPolling(true);
      toast.success("Export started…");
    } catch {
      toast.error("Failed to start export");
    }
  }, [projectId, readyClipCount]);

  // Poll export status
  useEffect(() => {
    if (!exportId || !polling) return;
    const interval = setInterval(async () => {
      try {
        const status = await getExportStatus(exportId);
        setExportStatus(status);
        if (status.status === "done" || status.status === "failed") {
          setPolling(false);
          clearInterval(interval);
          if (status.status === "done") {
            toast.success("Export ready!");
          } else {
            toast.error(`Export failed: ${status.error ?? "unknown error"}`);
          }
        }
      } catch {
        setPolling(false);
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [exportId, polling]);

  const isProcessing = polling || exportStatus?.status === "processing" || exportStatus?.status === "queued";

  return (
    <div className="flex items-center gap-3">
      {exportStatus?.status === "done" && exportId && (
        <a
          href={getExportDownloadUrl(exportId)}
          download
          className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
        >
          <Download size={14} /> Download Video
        </a>
      )}

      {isProcessing && (
        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" />
          Exporting… {exportStatus?.progress ?? 0}%
        </span>
      )}

      <Button
        size="sm"
        className="bg-violet-600 hover:bg-violet-700"
        onClick={startExport}
        disabled={isProcessing || readyClipCount === 0}
      >
        <Download size={14} className="mr-1.5" />
        Export Video
      </Button>
    </div>
  );
}
