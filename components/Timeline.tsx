"use client";
import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ClipBlock } from "./ClipBlock";
import { InsertClipDialog } from "./InsertClipDialog";
import type { Clip } from "@/lib/types";
import { deleteClip, regenerateClip, reorderClip } from "@/lib/api";
import { toast } from "sonner";

interface TimelineProps {
  projectId: string;
  clips: Clip[];
  selectedClip: Clip | null;
  onSelectClip: (clip: Clip) => void;
  onClipsChange: (clips: Clip[]) => void;
  onClipUpdate: (clipId: string, patch: Partial<Clip>) => void;
  onClipRemove: (clipId: string) => void;
  onClipAdd: (clip: Clip) => void;
}

export function Timeline({
  projectId,
  clips,
  selectedClip,
  onSelectClip,
  onClipsChange,
  onClipUpdate,
  onClipRemove,
  onClipAdd,
}: TimelineProps) {
  const [insertAfterOrder, setInsertAfterOrder] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = clips.findIndex((c) => c.id === active.id);
      const newIndex = clips.findIndex((c) => c.id === over.id);
      const reordered = arrayMove(clips, oldIndex, newIndex).map((c, i) => ({
        ...c,
        order: i + 1,
      }));
      onClipsChange(reordered);

      try {
        await reorderClip(String(active.id), newIndex + 1);
      } catch {
        toast.error("Failed to save clip order");
      }
    },
    [clips, onClipsChange]
  );

  const handleRegenerate = useCallback(
    async (clipId: string, desc?: string, audio?: string) => {
      onClipUpdate(clipId, { status: "generating" });
      try {
        await regenerateClip(clipId, desc, audio);
        toast.success("Regeneration queued");
      } catch {
        onClipUpdate(clipId, { status: "failed" });
        toast.error("Failed to queue regeneration");
      }
    },
    [onClipUpdate]
  );

  const handleDelete = useCallback(
    async (clipId: string) => {
      onClipRemove(clipId);
      try {
        await deleteClip(clipId);
        toast.success("Clip deleted");
      } catch {
        toast.error("Failed to delete clip");
      }
    },
    [onClipRemove]
  );

  const doneCount = clips.filter((c) => c.status === "done").length;
  const totalCount = clips.length;

  return (
    <div className="flex flex-col gap-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3 px-4">
        <span className="text-xs text-zinc-400 whitespace-nowrap">
          {doneCount} / {totalCount} clips ready
        </span>
        <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-500"
            style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {/* Timeline scroll area */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 px-4 min-w-max">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {clips.map((clip, idx) => (
                <ClipBlock
                  key={clip.id}
                  clip={clip}
                  index={idx}
                  isSelected={selectedClip?.id === clip.id}
                  onSelect={onSelectClip}
                  onRegenerate={handleRegenerate}
                  onDelete={handleDelete}
                  onInsertAfter={(order) => setInsertAfterOrder(order)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Empty state */}
          {clips.length === 0 && (
            <div className="flex items-center justify-center w-64 h-28 border-2 border-dashed border-zinc-700 rounded-lg">
              <span className="text-zinc-500 text-sm">No clips yet</span>
            </div>
          )}
        </div>
      </div>

      {/* Time ruler */}
      {clips.length > 0 && (
        <div className="flex px-4">
          {clips.map((clip, idx) => (
            <div key={clip.id} className="flex-shrink-0 w-32 mr-2">
              <div className="text-[10px] text-zinc-600 font-mono">
                {idx * 8}s–{(idx + 1) * 8}s
              </div>
            </div>
          ))}
        </div>
      )}

      <InsertClipDialog
        projectId={projectId}
        afterOrder={insertAfterOrder}
        open={insertAfterOrder !== null}
        onClose={() => setInsertAfterOrder(null)}
        onClipAdded={onClipAdd}
      />
    </div>
  );
}
