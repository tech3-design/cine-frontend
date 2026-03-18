"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { Clip } from "@/lib/types";

interface PreviewPlayerProps {
  clips: Clip[];
  selectedClip: Clip | null;
}

export function PreviewPlayer({ clips, selectedClip }: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);

  const doneClips = clips.filter((c) => c.status === "done" && c.video_url);

  // Refs to avoid stale closures in event handlers
  const queueIndexRef = useRef(queueIndex);
  const doneClipsRef = useRef(doneClips);
  // Whether we should auto-play the next loaded clip
  const shouldAutoPlayRef = useRef(false);
  // Ignore pause events fired by .load()
  const loadingRef = useRef(false);

  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { doneClipsRef.current = doneClips; });

  // When a clip is selected from timeline, jump to it
  useEffect(() => {
    if (selectedClip?.status === "done" && selectedClip.video_url) {
      setActiveClip(selectedClip);
      const idx = doneClipsRef.current.findIndex((c) => c.id === selectedClip.id);
      setQueueIndex(idx >= 0 ? idx : 0);
      // If already playing, keep playing the new clip
      shouldAutoPlayRef.current = playing;
    }
  }, [selectedClip]);

  // Auto-advance to next clip when current ends
  const handleEnded = () => {
    const nextIndex = queueIndexRef.current + 1;
    const dc = doneClipsRef.current;
    // Always auto-play the next clip (user hasn't paused)
    shouldAutoPlayRef.current = true;
    if (nextIndex < dc.length) {
      setQueueIndex(nextIndex);
      setActiveClip(dc[nextIndex]!);
    } else {
      // Loop back to beginning
      setQueueIndex(0);
      setActiveClip(dc[0]!);
    }
  };

  // When activeClip changes, load and play
  useEffect(() => {
    const video = videoRef.current;
    if (!activeClip || !video) return;

    loadingRef.current = true;
    video.load();

    const onCanPlay = () => {
      loadingRef.current = false;
      if (shouldAutoPlayRef.current) {
        video.play().catch(() => {});
      }
    };
    video.addEventListener("canplay", onCanPlay, { once: true });
    return () => video.removeEventListener("canplay", onCanPlay);
  }, [activeClip]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      shouldAutoPlayRef.current = false;
      video.pause();
    } else {
      shouldAutoPlayRef.current = true;
      if (!activeClip && doneClips.length > 0) {
        setActiveClip(doneClips[0]!);
        setQueueIndex(0);
        // canplay handler will start playback
        return;
      }
      video.play().catch(() => {});
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg overflow-hidden w-full">
      {/* Video area */}
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {activeClip?.video_url ? (
          <video
            ref={videoRef}
            src={activeClip.video_url}
            className="w-full h-full object-contain"
            muted={muted}
            onEnded={handleEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => { if (!loadingRef.current) setPlaying(false); }}
          />
        ) : (
          <div className="text-zinc-600 text-sm">
            {doneClips.length === 0 ? "Waiting for clips…" : "Select a clip to preview"}
          </div>
        )}

        {/* Overlay: clip info */}
        {activeClip && (
          <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1 text-[10px] text-zinc-300">
            Clip #{activeClip.order} · {activeClip.duration}s
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-zinc-800">
        <button
          onClick={togglePlay}
          disabled={doneClips.length === 0}
          className="text-zinc-200 hover:text-white disabled:text-zinc-600"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button
          onClick={() => setMuted((v) => !v)}
          className="text-zinc-400 hover:text-zinc-200"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <span className="text-xs text-zinc-500 ml-auto">
          {doneClips.length} clip{doneClips.length !== 1 ? "s" : ""} ready · native Veo 3.1 audio
        </span>
      </div>
    </div>
  );
}
