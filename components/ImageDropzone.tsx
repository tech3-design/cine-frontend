"use client";
import { useRef, useState, useCallback } from "react";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ImageTag = "character" | "side_view" | "background" | "style" | "object" | "other";

const TAG_META: Record<ImageTag, { label: string; color: string }> = {
  character:  { label: "Character",   color: "bg-violet-700/70 text-violet-200" },
  side_view:  { label: "Side View",   color: "bg-blue-700/70 text-blue-200" },
  background: { label: "Background",  color: "bg-emerald-700/70 text-emerald-200" },
  style:      { label: "Style Ref",   color: "bg-amber-700/70 text-amber-200" },
  object:     { label: "Object",      color: "bg-rose-700/70 text-rose-200" },
  other:      { label: "Other",       color: "bg-zinc-600/70 text-zinc-300" },
};

const AUTO_TAG_CYCLE: ImageTag[] = [
  "character", "side_view", "background", "style", "object", "other",
];

export interface ReferenceImage {
  file: File;
  tag: ImageTag;
  preview: string; // object URL — revoke on remove
}

interface Props {
  images: ReferenceImage[];
  onChange: (images: ReferenceImage[]) => void;
  maxImages?: number;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";

export function ImageDropzone({ images, onChange, maxImages = 8 }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const valid = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
      const slots = maxImages - images.length;
      if (slots <= 0) return;
      const added: ReferenceImage[] = valid.slice(0, slots).map((file, i) => ({
        file,
        tag: AUTO_TAG_CYCLE[(images.length + i) % AUTO_TAG_CYCLE.length],
        preview: URL.createObjectURL(file),
      }));
      onChange([...images, ...added]);
    },
    [images, maxImages, onChange]
  );

  const remove = (idx: number) => {
    const next = [...images];
    URL.revokeObjectURL(next[idx].preview);
    next.splice(idx, 1);
    onChange(next);
  };

  const cycleTag = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const next = [...images];
    const cur = AUTO_TAG_CYCLE.indexOf(next[idx].tag);
    next[idx] = { ...next[idx], tag: AUTO_TAG_CYCLE[(cur + 1) % AUTO_TAG_CYCLE.length] };
    onChange(next);
  };

  const full = images.length >= maxImages;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => !full && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !full && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer select-none transition-all duration-200",
          dragging
            ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
            : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/70",
          full && "pointer-events-none opacity-40 cursor-not-allowed"
        )}
      >
        <ImageIcon size={24} className={cn("transition-colors", dragging ? "text-violet-400" : "text-zinc-500")} />
        <div className="text-center">
          <p className="text-sm text-zinc-200 font-medium">
            {full ? `Max ${maxImages} images reached` : "Drop reference images here"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            or click to browse · Characters, angles, backgrounds, style
          </p>
        </div>
        {!full && (
          <div className="flex items-center gap-3 mt-1">
            {(["character", "side_view", "background", "style"] as ImageTag[]).map((t) => (
              <span
                key={t}
                className={cn("text-[10px] font-semibold rounded px-1.5 py-0.5", TAG_META[t].color)}
              >
                {TAG_META[t].label}
              </span>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Thumbnail grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((img, idx) => {
            const meta = TAG_META[img.tag];
            return (
              <div
                key={idx}
                className="group relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className="w-full h-full object-cover"
                />

                {/* Tag badge — click cycles through tag types */}
                <button
                  type="button"
                  onClick={(e) => cycleTag(e, idx)}
                  title="Click to change category"
                  className={cn(
                    "absolute bottom-0 inset-x-0 text-[9px] font-bold text-center py-1 truncate backdrop-blur-sm transition-opacity",
                    meta.color
                  )}
                >
                  {meta.label}
                </button>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(idx); }}
                  className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/80"
                >
                  <X size={10} className="text-white" />
                </button>

                {/* File name tooltip on hover */}
                <div className="absolute inset-x-0 top-0 bg-black/60 text-[9px] text-zinc-300 px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  {img.file.name}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-[11px] text-zinc-600">
          {images.length}/{maxImages} image{images.length !== 1 ? "s" : ""} · Click a tag to change its category
        </p>
      )}
    </div>
  );
}
