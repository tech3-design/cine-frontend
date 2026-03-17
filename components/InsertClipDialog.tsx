"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { insertClip } from "@/lib/api";
import { toast } from "sonner";
import type { Clip } from "@/lib/types";

interface InsertClipDialogProps {
  projectId: string;
  afterOrder: number | null;
  open: boolean;
  onClose: () => void;
  onClipAdded: (clip: Clip) => void;
}

export function InsertClipDialog({
  projectId,
  afterOrder,
  open,
  onClose,
  onClipAdded,
}: InsertClipDialogProps) {
  const [description, setDescription] = useState("");
  const [audioCues, setAudioCues] = useState("");
  const [cameraNote, setCameraNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInsert = async () => {
    if (!description.trim() || afterOrder === null) return;
    setLoading(true);
    try {
      const clip = await insertClip(projectId, afterOrder, description, cameraNote, audioCues);
      onClipAdded(clip);
      toast.success("Clip inserted and queued for generation");
      setDescription("");
      setAudioCues("");
      setCameraNote("");
      onClose();
    } catch {
      toast.error("Failed to insert clip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Insert Clip After #{afterOrder}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Scene description *</label>
            <Textarea
              placeholder="Describe what should happen in this scene…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Camera note</label>
            <Textarea
              placeholder="e.g. slow zoom in, wide shot, tracking"
              value={cameraNote}
              onChange={(e) => setCameraNote(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
              rows={1}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Audio cues</label>
            <Textarea
              placeholder="e.g. rain drops, footsteps, distant thunder"
              value={audioCues}
              onChange={(e) => setAudioCues(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={handleInsert}
              disabled={loading || !description.trim()}
            >
              {loading ? "Inserting…" : "Insert & Generate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
