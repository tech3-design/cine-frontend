"use client";
import { X } from "lucide-react";
import type { Character } from "@/lib/types";

interface CharacterCardProps {
  character: Character;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function CharacterCard({ character, onDelete, compact }: CharacterCardProps) {
  const thumb = character.reference_image_urls?.[0];

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 bg-violet-500/20 text-violet-300 text-[10px] px-1.5 py-0.5 rounded-full">
        {thumb && (
          <img src={thumb} alt={character.name} className="w-3 h-3 rounded-full object-cover" />
        )}
        @{character.handle}
      </span>
    );
  }

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 flex gap-3 relative group">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-zinc-700 flex-shrink-0">
        {thumb ? (
          <img src={thumb} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg font-bold">
            {character.name[0]}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">{character.name}</span>
          <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">
            @{character.handle}
          </span>
        </div>
        {character.description && (
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{character.description}</p>
        )}
        {character.reference_image_urls.length > 1 && (
          <div className="flex gap-1 mt-1.5">
            {character.reference_image_urls.slice(1, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="w-6 h-6 rounded object-cover" />
            ))}
            {character.reference_image_urls.length > 4 && (
              <span className="text-[10px] text-zinc-500 self-center">
                +{character.reference_image_urls.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(character.id)}
          className="absolute top-1.5 right-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
