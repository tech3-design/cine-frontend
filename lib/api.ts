import axios from "axios";
import type { Clip, ClipStatus, ExportStatus, Project } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const http = axios.create({ baseURL: BASE });

// ── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(data: {
  title: string;
  prompt: string;
  duration: number;
  user_id?: string;
}): Promise<Project> {
  const res = await http.post<Project>("/projects", data);
  return res.data;
}

export async function listProjects(user_id = "anonymous"): Promise<{ projects: Project[]; total: number }> {
  const res = await http.get("/projects", { params: { user_id } });
  return res.data;
}

export async function getProject(id: string): Promise<Project> {
  const res = await http.get<Project>(`/projects/${id}`);
  return res.data;
}

export async function planProject(
  projectId: string,
  referenceImages: Array<{ file: File; label: string }> = []
): Promise<{ clips: Clip[] }> {
  const fd = new FormData();
  referenceImages.forEach(({ file, label }) => {
    fd.append("reference_images", file);
    fd.append("reference_image_labels", label);
  });
  const res = await http.post(`/projects/${projectId}/plan`, fd);
  return res.data;
}

export async function getProjectClips(projectId: string): Promise<{ clips: Clip[] }> {
  const res = await http.get(`/projects/${projectId}/clips`);
  return res.data;
}

export async function deleteProject(id: string): Promise<void> {
  await http.delete(`/projects/${id}`);
}

// ── Clips ─────────────────────────────────────────────────────────────────────

export async function getClip(clipId: string): Promise<Clip> {
  const res = await http.get<Clip>(`/clips/${clipId}`);
  return res.data;
}

export async function regenerateClip(
  clipId: string,
  overrideDescription?: string,
  overrideAudioCues?: string
): Promise<Clip> {
  const res = await http.post<Clip>(`/clips/${clipId}/regenerate`, {
    override_description: overrideDescription ?? null,
    override_audio_cues: overrideAudioCues ?? null,
  });
  return res.data;
}

export async function insertClip(
  projectId: string,
  afterOrder: number,
  sceneDescription: string,
  camerNote = "",
  audioCues = ""
): Promise<Clip> {
  const res = await http.post<Clip>(`/clips/projects/${projectId}/insert`, {
    after_order: afterOrder,
    scene_description: sceneDescription,
    camera_note: camerNote,
    audio_cues: audioCues,
  });
  return res.data;
}

export async function deleteClip(clipId: string): Promise<void> {
  await http.delete(`/clips/${clipId}`);
}

export async function reorderClip(clipId: string, newOrder: number): Promise<Clip> {
  const res = await http.patch<Clip>(`/clips/${clipId}/reorder`, { new_order: newOrder });
  return res.data;
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function triggerExport(projectId: string): Promise<{ export_id: string }> {
  const res = await http.post(`/export/projects/${projectId}`);
  return res.data;
}

export async function getExportStatus(exportId: string): Promise<ExportStatus> {
  const res = await http.get<ExportStatus>(`/export/${exportId}/status`);
  return res.data;
}
