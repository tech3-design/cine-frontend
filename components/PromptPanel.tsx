"use client";
import { useState, useCallback } from "react";
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
import { Sparkles, Plus, X, Users, FileText, Wand2 } from "lucide-react";
import {
  createProject,
  planProject,
  createCharacter,
  planFromScript,
} from "@/lib/api";
import { toast } from "sonner";
import { totalClips } from "@/lib/utils";
import { ImageDropzone, type ReferenceImage } from "@/components/ImageDropzone";
import { CharacterCard } from "@/components/CharacterCard";
import type { Character } from "@/lib/types";

const DURATION_OPTIONS = [
  { label: "30 seconds (4 clips)", value: 30 },
  { label: "1 minute (8 clips)", value: 60 },
  { label: "2 minutes (15 clips)", value: 120 },
  { label: "5 minutes (38 clips)", value: 300 },
  { label: "10 minutes (75 clips)", value: 600 },
  { label: "20 minutes (150 clips)", value: 1200 },
];

type Mode = "simple" | "script";
type ScriptStep = "characters" | "script" | "generate";

// ── Character form used during script mode setup ─────────────────────────────
interface CharacterDraft {
  name: string;
  description: string;
  imageFiles: File[];
  imagePreviews: string[];
}

function emptyDraft(): CharacterDraft {
  return { name: "", description: "", imageFiles: [], imagePreviews: [] };
}

export function PromptPanel() {
  const router = useRouter();

  // Shared state
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("simple");
  const [loading, setLoading] = useState(false);

  // Simple mode
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [images, setImages] = useState<ReferenceImage[]>([]);

  // Script mode
  const [scriptStep, setScriptStep] = useState<ScriptStep>("characters");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charDraft, setCharDraft] = useState<CharacterDraft>(emptyDraft());
  const [addingChar, setAddingChar] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  // ── Simple mode handler ────────────────────────────────────────────────────
  const handleGenerateSimple = async () => {
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

  // ── Script mode: create project if needed ──────────────────────────────────
  const ensureProject = useCallback(async (): Promise<string> => {
    if (projectId) return projectId;
    if (!title.trim()) {
      toast.error("Please provide a project title first");
      throw new Error("No title");
    }
    const project = await createProject({
      title,
      prompt: "Script-based anime project",
      duration: 56, // default 7 episodes × 8s, updated later
    });
    setProjectId(project.id);
    return project.id;
  }, [projectId, title]);

  // ── Add character ──────────────────────────────────────────────────────────
  const handleAddCharacter = async () => {
    if (!charDraft.name.trim()) {
      toast.error("Character needs a name");
      return;
    }
    setAddingChar(true);
    try {
      const pid = await ensureProject();
      const char = await createCharacter(
        pid,
        charDraft.name,
        charDraft.description,
        charDraft.imageFiles
      );
      setCharacters((prev) => [...prev, char]);
      // Clean up previews
      charDraft.imagePreviews.forEach(URL.revokeObjectURL);
      setCharDraft(emptyDraft());
      toast.success(`Added @${char.handle}`);
    } catch (err: any) {
      if (err.message !== "No title") {
        toast.error("Failed to add character");
        console.error(err);
      }
    } finally {
      setAddingChar(false);
    }
  };

  const handleRemoveCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    // Fire and forget delete
    import("@/lib/api").then((api) => api.deleteCharacter(id).catch(() => {}));
  };

  // ── Script mode: generate from script ──────────────────────────────────────
  const handleGenerateScript = async () => {
    if (!scriptText.trim()) {
      toast.error("Please paste your script");
      return;
    }
    if (characters.length === 0) {
      toast.error("Add at least one character first");
      return;
    }
    setLoading(true);
    try {
      const pid = await ensureProject();
      toast.success("Parsing script and planning episodes…");
      const result = await planFromScript(pid, scriptText);
      toast.success(`Generating ${result.clips.length} episodes…`);
      router.push(`/projects/${pid}`);
    } catch (err: any) {
      if (err.message !== "No title") {
        toast.error("Failed to generate from script");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Character image handling ───────────────────────────────────────────────
  const handleCharImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setCharDraft((prev) => ({
      ...prev,
      imageFiles: [...prev.imageFiles, ...files],
      imagePreviews: [...prev.imagePreviews, ...files.map((f) => URL.createObjectURL(f))],
    }));
  };

  const removeCharImage = (index: number) => {
    setCharDraft((prev) => {
      URL.revokeObjectURL(prev.imagePreviews[index]);
      return {
        ...prev,
        imageFiles: prev.imageFiles.filter((_, i) => i !== index),
        imagePreviews: prev.imagePreviews.filter((_, i) => i !== index),
      };
    });
  };

  // ── Highlight @handles in script ───────────────────────────────────────────
  const knownHandles = characters.map((c) => c.handle);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 w-full max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">New Video Project</h2>
        <p className="text-xs text-zinc-500">
          Create anime clips with AI. Choose Simple mode or Script mode for multi-episode series.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Project title</label>
        <input
          type="text"
          placeholder="e.g. Rainy Day Treasure"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("simple")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "simple"
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
          }`}
        >
          <Wand2 size={14} /> Simple Prompt
        </button>
        <button
          onClick={() => setMode("script")}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            mode === "script"
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
          }`}
        >
          <FileText size={14} /> Script Mode
        </button>
      </div>

      {/* ── SIMPLE MODE ─────────────────────────────────────────────────── */}
      {mode === "simple" && (
        <>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Story prompt</label>
            <Textarea
              placeholder="A man walks through a neon-lit cyberpunk city at night, rain reflecting the city lights on the wet streets…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm min-h-[120px]"
            />
          </div>

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

          <div>
            <label className="text-xs text-zinc-400 mb-2 block">
              Reference images{" "}
              <span className="text-zinc-600">(optional · up to 8)</span>
            </label>
            <ImageDropzone images={images} onChange={setImages} maxImages={8} />
          </div>

          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium"
            onClick={handleGenerateSimple}
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
        </>
      )}

      {/* ── SCRIPT MODE ─────────────────────────────────────────────────── */}
      {mode === "script" && (
        <>
          {/* Step tabs */}
          <div className="flex gap-1 text-xs">
            {(["characters", "script", "generate"] as ScriptStep[]).map((step, i) => (
              <button
                key={step}
                onClick={() => setScriptStep(step)}
                className={`flex-1 px-2 py-1.5 rounded text-center capitalize transition-colors ${
                  scriptStep === step
                    ? "bg-violet-600/20 text-violet-400 font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {i + 1}. {step === "characters" ? "Characters" : step === "script" ? "Script" : "Generate"}
              </button>
            ))}
          </div>

          {/* ── Step 1: Characters ──────────────────────────────────────── */}
          {scriptStep === "characters" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Users size={12} />
                Add characters with reference images. Use <code className="bg-zinc-800 px-1 rounded">@handle</code> in your script.
              </div>

              {/* Existing characters */}
              {characters.length > 0 && (
                <div className="space-y-2">
                  {characters.map((c) => (
                    <CharacterCard key={c.id} character={c} onDelete={handleRemoveCharacter} />
                  ))}
                </div>
              )}

              {/* Add character form */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Character name (e.g. Ru-Du)"
                    value={charDraft.name}
                    onChange={(e) => setCharDraft((p) => ({ ...p, name: e.target.value }))}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  {charDraft.name && (
                    <span className="text-[10px] text-violet-400 self-center whitespace-nowrap">
                      @{charDraft.name.toLowerCase().trim().replace(/\s+/g, "-")}
                    </span>
                  )}
                </div>

                <Textarea
                  placeholder="Describe this character's appearance: hair color, clothing, body type, distinguishing features…"
                  value={charDraft.description}
                  onChange={(e) => setCharDraft((p) => ({ ...p, description: e.target.value }))}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm min-h-[60px]"
                />

                {/* Image upload */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-[10px] text-zinc-500">Reference images</label>
                    <label className="cursor-pointer text-[10px] text-violet-400 hover:text-violet-300">
                      + Add images
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleCharImageFiles}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {charDraft.imagePreviews.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {charDraft.imagePreviews.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="w-10 h-10 rounded object-cover" />
                          <button
                            onClick={() => removeCharImage(i)}
                            className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} className="text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                  onClick={handleAddCharacter}
                  disabled={addingChar || !charDraft.name.trim()}
                >
                  {addingChar ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding…
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Plus size={14} /> Add Character
                    </span>
                  )}
                </Button>
              </div>

              <Button
                className="w-full bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 font-medium"
                onClick={() => setScriptStep("script")}
                disabled={characters.length === 0}
              >
                Next: Write Script →
              </Button>
            </div>
          )}

          {/* ── Step 2: Script ─────────────────────────────────────────── */}
          {scriptStep === "script" && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                Paste your full script (7-8 episodes). Use{" "}
                {knownHandles.map((h) => (
                  <code key={h} className="bg-violet-500/10 text-violet-400 px-1 rounded mx-0.5">
                    @{h}
                  </code>
                ))}{" "}
                to reference characters.
              </div>

              <Textarea
                placeholder={`Episode 1: Picnic Plans\n@${knownHandles[0] || "character"} is excited about the picnic.\n\nEpisode 2: Rain Begins\nRaindrops start falling...\n\n(Paste your full 7-8 episode script here)`}
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm min-h-[250px] font-mono"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  onClick={() => setScriptStep("characters")}
                >
                  ← Characters
                </Button>
                <Button
                  className="flex-1 bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 font-medium"
                  onClick={() => setScriptStep("generate")}
                  disabled={!scriptText.trim()}
                >
                  Next: Review & Generate →
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Generate ───────────────────────────────────────── */}
          {scriptStep === "generate" && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-400">
                Review your setup and generate all episodes.
              </div>

              {/* Summary */}
              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Characters</span>
                  <span className="text-zinc-300">{characters.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {characters.map((c) => (
                    <CharacterCard key={c.id} character={c} compact />
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-700/50">
                  <span className="text-zinc-500">Script length</span>
                  <span className="text-zinc-300">{scriptText.length} chars</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  onClick={() => setScriptStep("script")}
                >
                  ← Script
                </Button>
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium"
                  onClick={handleGenerateScript}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Parsing script…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles size={16} /> Generate Episodes
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
