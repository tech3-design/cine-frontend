export type ProjectStatus = "draft" | "planning" | "generating" | "done" | "failed";
export type ClipStatus = "pending" | "generating" | "done" | "failed";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  duration: number;
  global_memory: Record<string, unknown>;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Clip {
  id: string;
  project_id: string;
  order: number;
  scene_description: string;
  camera_note: string;
  audio_cues: string;
  prompt_sent: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number;
  status: ClipStatus;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExportStatus {
  export_id: string;
  status: "queued" | "processing" | "done" | "failed";
  progress: number;
  video_url: string | null;
  error: string | null;
}

export interface WsMessage {
  type: "clip_update" | "export_done" | "pong";
  clip_id?: string;
  status?: ClipStatus;
  video_url?: string | null;
  export_id?: string;
}
