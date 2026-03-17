"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getProjectClips } from "@/lib/api";
import { useProjectWebSocket } from "@/lib/ws";
import type { Clip, ClipStatus, WsMessage } from "@/lib/types";

export function useClips(projectId: string) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClips = useCallback(async () => {
    try {
      const data = await getProjectClips(projectId);
      setClips(data.clips);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchClips();
  }, [fetchClips]);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === "clip_update" && msg.clip_id) {
      setClips((prev) =>
        prev.map((c) =>
          c.id === msg.clip_id
            ? { ...c, status: msg.status as ClipStatus, video_url: msg.video_url ?? c.video_url }
            : c
        )
      );
    }
  }, []);

  useProjectWebSocket(projectId, handleWsMessage);

  const updateClipLocally = useCallback((clipId: string, patch: Partial<Clip>) => {
    setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, ...patch } : c)));
  }, []);

  const removeClipLocally = useCallback((clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
  }, []);

  const addClipLocally = useCallback((clip: Clip) => {
    setClips((prev) => {
      const next = [...prev, clip];
      return next.sort((a, b) => a.order - b.order);
    });
  }, []);

  return { clips, loading, fetchClips, updateClipLocally, removeClipLocally, addClipLocally, setClips };
}
