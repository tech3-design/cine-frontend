"use client";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, RefreshCw, Trash2, Plus, GripVertical, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Clip } from "@/lib/types";

interface ClipBlockProps {
  clip: Clip;
  index: number;
  isSelected: boolean;
  onSelect: (clip: Clip) => void;
  onRegenerate: (clipId: string, desc?: string, audio?: string) => void;
  onDelete: (clipId: string) => void;
  onInsertAfter: (order: number) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-300",
  generating: "bg-yellow-500/20 text-yellow-400 animate-pulse",
  done: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  generating: "Generating…",
  done: "Ready",
  failed: "Failed",
};

export function ClipBlock({
  clip,
  index,
  isSelected,
  onSelect,
  onRegenerate,
  onDelete,
  onInsertAfter,
}: ClipBlockProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showRegenDialog, setShowRegenDialog] = useState(false);
  const [regenDesc, setRegenDesc] = useState(clip.scene_description);
  const [regenAudio, setRegenAudio] = useState(clip.audio_cues);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative flex-shrink-0 w-32 h-28 rounded-lg border-2 cursor-pointer overflow-hidden select-none",
          "bg-zinc-900 transition-all duration-200",
          isSelected ? "border-violet-500 shadow-lg shadow-violet-500/30" : "border-zinc-700 hover:border-zinc-500",
          isDragging && "opacity-50 scale-95"
        )}
        onClick={() => onSelect(clip)}
      >
        {/* Thumbnail / placeholder */}
        {clip.video_url ? (
          <video
            src={clip.video_url}
            className="w-full h-16 object-cover bg-black"
            muted
            preload="metadata"
          />
        ) : (
          <div className="w-full h-16 bg-zinc-800 flex items-center justify-center">
            {clip.status === "generating" ? (
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-zinc-600 text-xs">No preview</span>
            )}
          </div>
        )}

        {/* Bottom info bar */}
        <div className="px-2 py-1 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-mono">#{index + 1}</span>
            <Badge className={cn("text-[10px] px-1 py-0", STATUS_COLORS[clip.status])}>
              {STATUS_LABELS[clip.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 truncate flex-1">{clip.duration}s</span>
            {clip.audio_cues && <Volume2 size={10} className="text-violet-400 flex-shrink-0" />}
          </div>
        </div>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={12} />
        </div>

        {/* Menu button */}
        <button
          className="absolute top-1 right-1 text-zinc-600 hover:text-zinc-300"
          onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
        >
          <MoreVertical size={12} />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            className="absolute top-6 right-1 z-50 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl min-w-[140px] py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700"
              onClick={() => { setShowRegenDialog(true); setShowMenu(false); }}
            >
              <RefreshCw size={12} /> Regenerate
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700"
              onClick={() => { onInsertAfter(clip.order); setShowMenu(false); }}
            >
              <Plus size={12} /> Insert After
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-700"
              onClick={() => { onDelete(clip.id); setShowMenu(false); }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Regenerate dialog */}
      <Dialog open={showRegenDialog} onOpenChange={setShowRegenDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Regenerate Clip #{index + 1}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Scene description</label>
              <Textarea
                value={regenDesc}
                onChange={(e) => setRegenDesc(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Audio cues</label>
              <Textarea
                value={regenAudio}
                onChange={(e) => setRegenAudio(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 text-sm"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRegenDialog(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  onRegenerate(clip.id, regenDesc, regenAudio);
                  setShowRegenDialog(false);
                }}
              >
                Regenerate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
