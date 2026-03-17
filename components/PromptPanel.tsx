"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { createProject, planProject } from "@/lib/api";
import { toast } from "sonner";
import { totalClips } from "@/lib/utils";
import { ImageDropzone, type ReferenceImage } from "@/components/ImageDropzone";

const DURATION_OPTIONS = [
  { label: "30 seconds (4 clips)", value: 30 },
  { label: "1 minute (8 clips)", value: 60 },
  { label: "2 minutes (15 clips)", value: 120 },
  { label: "5 minutes (38 clips)", value: 300 },
  { label: "10 minutes (75 clips)", value: 600 },
  { label: "20 minutes (150 clips)", value: 1200 },
];

export function PromptPanel() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [images, setImages] = useState<ReferenceImage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!title.trim() || !prompt.trim()) {
      toast.error("Please provide a title and story prompt");
      return;
    }
    setLoading(true);
    try {
      const project = await createProject({ title, prompt, duration });
      toast.success("Project created — planning scenes…");
      await planProject(
        project.id,
        images.map((img) => ({ file: img.file, label: img.tag }))
      );
      toast.success(`Generating ${totalClips(duration)} clips…`);
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.error("Failed to start project");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 w-full max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">New Video Project</h2>
        <p className="text-xs text-zinc-500">
          Describe your story. Veo 3.1 will generate each 8-second scene with native audio.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Project title</label>
        <input
          type="text"
          placeholder="e.g. Cyberpunk Night Walk"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Prompt */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Story prompt</label>
        <Textarea
          placeholder="A man walks through a neon-lit cyberpunk city at night, rain reflecting the city lights on the wet streets. He passes through crowds, alleyways, and finally reaches a rooftop overlooking the cityscape…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm min-h-[120px]"
        />
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Target duration</label>
        <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
            {DURATION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reference images — drag & drop */}
      <div>
        <label className="text-xs text-zinc-400 mb-2 block">
          Reference images{" "}
          <span className="text-zinc-600">(optional · up to 8 · characters, backgrounds, style, angles)</span>
        </label>
        <ImageDropzone images={images} onChange={setImages} maxImages={8} />
      </div>

      <Button
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Planning scenes…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles size={16} /> Generate {totalClips(duration)} clips ({duration}s)
          </span>
        )}
      </Button>
    </div>
  );
}
