"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProject } from "@/lib/api";
import { useClips } from "@/hooks/useClips";
import { Timeline } from "@/components/Timeline";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { ExportButton } from "@/components/ExportButton";
import type { Clip, Project } from "@/lib/types";
import { Film, ArrowLeft, Clock, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  planning: "bg-blue-500/20 text-blue-400",
  generating: "bg-yellow-500/20 text-yellow-400",
  done: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  const {
    clips,
    loading,
    updateClipLocally,
    removeClipLocally,
    addClipLocally,
    setClips,
  } = useClips(projectId);

  useEffect(() => {
    getProject(projectId).then(setProject).catch(() => router.push("/"));
  }, [projectId]);

  // Auto-select first done clip for preview
  useEffect(() => {
    if (!selectedClip) {
      const first = clips.find((c) => c.status === "done");
      if (first) setSelectedClip(first);
    }
  }, [clips, selectedClip]);

  const doneCount = clips.filter((c) => c.status === "done").length;

  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-zinc-500 hover:text-zinc-300">
          <ArrowLeft size={18} />
        </Link>
        <Film className="text-violet-400" size={18} />
        <span className="text-sm font-semibold text-zinc-100 truncate">{project.title}</span>
        <Badge className={`text-[10px] px-1.5 ml-1 ${STATUS_COLORS[project.status] ?? ""}`}>
          {project.status}
        </Badge>
        <div className="flex items-center gap-1 text-xs text-zinc-500 ml-auto">
          <Clock size={12} /> {formatDuration(project.duration)}
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Volume2 size={12} className="text-violet-400" />
          Native Veo 3.1 audio
        </div>
        <ExportButton projectId={projectId} readyClipCount={doneCount} />
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview panel */}
        <div className="w-80 flex-shrink-0 border-r border-zinc-800 p-4">
          <PreviewPlayer clips={clips} selectedClip={selectedClip} />

          {/* Selected clip details */}
          {selectedClip && (
            <div className="mt-4 space-y-2">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Scene</span>
                <p className="text-xs text-zinc-300 mt-0.5">{selectedClip.scene_description}</p>
              </div>
              {selectedClip.camera_note && (
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Camera</span>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedClip.camera_note}</p>
                </div>
              )}
              {selectedClip.audio_cues && (
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                    <Volume2 size={9} className="text-violet-400" /> Audio cues
                  </span>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedClip.audio_cues}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Prompt summary */}
          <div className="px-6 py-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 line-clamp-2">{project.prompt}</p>
          </div>

          {/* Timeline editor */}
          <div className="flex-1 flex flex-col justify-center py-6">
            {loading ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <Timeline
                projectId={projectId}
                clips={clips}
                selectedClip={selectedClip}
                onSelectClip={setSelectedClip}
                onClipsChange={setClips}
                onClipUpdate={updateClipLocally}
                onClipRemove={removeClipLocally}
                onClipAdd={addClipLocally}
              />
            )}
          </div>

          {/* Stats bar */}
          <div className="px-6 py-2 border-t border-zinc-800 flex items-center gap-6 text-xs text-zinc-500">
            <span>{clips.length} total clips</span>
            <span className="text-emerald-400">{doneCount} done</span>
            <span className="text-yellow-400">
              {clips.filter((c) => c.status === "generating").length} generating
            </span>
            <span className="text-red-400">
              {clips.filter((c) => c.status === "failed").length} failed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
