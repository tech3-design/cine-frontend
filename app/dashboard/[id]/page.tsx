"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Film, Users, FileText, Sparkles, Plus, X, ArrowLeft,
  Clock, Volume2, MessageSquare, Download, ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCard } from "@/components/CharacterCard";
import { Timeline } from "@/components/Timeline";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { ExportButton } from "@/components/ExportButton";
import {
  getProject, listCharacters, createCharacter, deleteCharacter,
  planFromScript,
} from "@/lib/api";
import { useClips } from "@/hooks/useClips";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils";
import type { Character, Clip, Project } from "@/lib/types";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  planning: "bg-blue-500/20 text-blue-400",
  generating: "bg-yellow-500/20 text-yellow-400",
  done: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

interface CharacterDraft {
  name: string;
  description: string;
  imageFiles: File[];
  imagePreviews: string[];
}
const emptyDraft = (): CharacterDraft => ({
  name: "", description: "", imageFiles: [], imagePreviews: [],
});

type SidebarTab = "characters" | "script";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("characters");
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);

  // Characters
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charDraft, setCharDraft] = useState<CharacterDraft>(emptyDraft());
  const [addingChar, setAddingChar] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Script
  const [scriptText, setScriptText] = useState("");

  // Generation
  const [generating, setGenerating] = useState(false);

  const {
    clips, loading: clipsLoading, fetchClips,
    updateClipLocally, removeClipLocally, addClipLocally, setClips,
  } = useClips(projectId);

  // Fetch project + characters
  useEffect(() => {
    getProject(projectId)
      .then((p) => {
        setProject(p);
        if (p.script_raw) setScriptText(p.script_raw);
      })
      .catch(() => router.push("/dashboard"));

    listCharacters(projectId)
      .then((d) => setCharacters(d.characters))
      .catch(() => {});
  }, [projectId, router]);

  // Auto-select first done clip
  useEffect(() => {
    if (!selectedClip) {
      const first = clips.find((c) => c.status === "done");
      if (first) setSelectedClip(first);
    }
  }, [clips, selectedClip]);

  // Determine if we're in generation/done view
  const isGenerating = project?.status === "generating" || project?.status === "done" || project?.status === "planning";
  const hasClips = clips.length > 0;
  const showTimeline = isGenerating || hasClips;

  // ── Character handlers ─────────────────────────────────────────────────────
  const handleAddCharacter = async () => {
    if (!charDraft.name.trim()) { toast.error("Character needs a name"); return; }
    setAddingChar(true);
    try {
      const char = await createCharacter(projectId, charDraft.name, charDraft.description, charDraft.imageFiles);
      setCharacters((prev) => [...prev, char]);
      charDraft.imagePreviews.forEach(URL.revokeObjectURL);
      setCharDraft(emptyDraft());
      setShowAddForm(false);
      toast.success(`Added @${char.handle}`);
    } catch {
      toast.error("Failed to add character");
    } finally { setAddingChar(false); }
  };

  const handleRemoveCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    deleteCharacter(id).catch(() => {});
  };

  const addCharImages = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const accepted = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const valid = Array.from(files).filter((f) => accepted.includes(f.type));
    if (!valid.length) return;
    setCharDraft((prev) => ({
      ...prev,
      imageFiles: [...prev.imageFiles, ...valid],
      imagePreviews: [...prev.imagePreviews, ...valid.map((f) => URL.createObjectURL(f))],
    }));
  }, []);

  const handleCharImageFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    addCharImages(e.target.files);
    e.target.value = "";
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

  const [draggingImages, setDraggingImages] = useState(false);

  // ── Generate handler ───────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!scriptText.trim()) { toast.error("Write your script first"); return; }
    if (characters.length === 0) { toast.error("Add at least one character"); return; }
    setGenerating(true);
    try {
      toast.success("Parsing script...");
      const result = await planFromScript(projectId, scriptText);
      // Immediately show clips from the response (pending status)
      setClips(result.clips);
      toast.success(`Generating ${result.clips.length} episodes...`);
      // Refresh project to get updated status
      const updated = await getProject(projectId);
      setProject(updated);
      // Also refetch clips to get any server-side updates
      fetchClips();
    } catch {
      toast.error("Failed to generate");
    } finally { setGenerating(false); }
  };

  const knownHandles = characters.map((c) => c.handle);
  const doneCount = clips.filter((c) => c.status === "done").length;

  // Loading state
  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
          <ArrowLeft size={18} />
        </Link>
        <Film className="text-violet-400" size={18} />
        <span className="text-sm font-semibold text-zinc-100 truncate">{project.title}</span>
        <Badge className={`text-[10px] px-1.5 ${STATUS_COLORS[project.status] ?? ""}`}>
          {project.status}
        </Badge>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock size={12} /> {formatDuration(project.duration)}
          </span>
          {showTimeline && (
            <ExportButton projectId={projectId} readyClipCount={doneCount} />
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── LEFT SIDEBAR ────────────────────────────────────────────── */}
        <aside className="w-[260px] flex-shrink-0 border-r border-zinc-800 bg-zinc-900/60 flex flex-col">
          {/* Nav items */}
          <nav className="flex flex-col gap-0.5 p-3">
            <button
              onClick={() => setActiveTab("characters")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "characters"
                  ? "bg-violet-600/15 text-violet-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <Users size={16} />
              Characters
              {characters.length > 0 && (
                <span className="ml-auto text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                  {characters.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("script")}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "script"
                  ? "bg-violet-600/15 text-violet-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <FileText size={16} />
              Script
            </button>
          </nav>

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto border-t border-zinc-800/50">
            {/* ── Characters content ─────────────────────────────────── */}
            {activeTab === "characters" && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Characters ({characters.length})
                  </p>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-0.5"
                  >
                    <Plus size={10} /> Add
                  </button>
                </div>

                {/* Add character form */}
                {showAddForm && (
                  <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 space-y-2.5">
                    <input
                      type="text"
                      placeholder="Name (e.g. Ru-Du)"
                      value={charDraft.name}
                      onChange={(e) => setCharDraft((p) => ({ ...p, name: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    {charDraft.name && (
                      <p className="text-[10px] text-violet-400">
                        Handle: @{charDraft.name.toLowerCase().trim().replace(/\s+/g, "-")}
                      </p>
                    )}
                    <Textarea
                      placeholder="Appearance: hair, clothing, features..."
                      value={charDraft.description}
                      onChange={(e) => setCharDraft((p) => ({ ...p, description: e.target.value }))}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-xs min-h-[50px]"
                    />

                    {/* Image dropzone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDraggingImages(true); }}
                      onDragLeave={() => setDraggingImages(false)}
                      onDrop={(e) => { e.preventDefault(); setDraggingImages(false); addCharImages(e.dataTransfer.files); }}
                      onClick={() => document.getElementById("sidebar-char-img")?.click()}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-3 cursor-pointer transition-all ${
                        draggingImages
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500"
                      }`}
                    >
                      <ImageIcon size={14} className={draggingImages ? "text-violet-400" : "text-zinc-500"} />
                      <p className="text-[10px] text-zinc-400">Drop images or click to browse</p>
                      <input id="sidebar-char-img" type="file" accept="image/*" multiple onChange={handleCharImageFiles} className="hidden" />
                    </div>
                    {charDraft.imagePreviews.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {charDraft.imagePreviews.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="w-8 h-8 rounded object-cover" />
                            <button
                              onClick={() => removeCharImage(i)}
                              className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100"
                            >
                              <X size={8} className="text-red-400" />
                            </button>
                          </div>
                        ))}
                        <span className="text-[10px] text-zinc-500 self-center">{charDraft.imagePreviews.length} image{charDraft.imagePreviews.length !== 1 ? "s" : ""}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs h-7"
                        onClick={handleAddCharacter}
                        disabled={addingChar || !charDraft.name.trim()}
                      >
                        {addingChar ? "Adding..." : "Add"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-zinc-700 text-zinc-400 text-xs h-7"
                        onClick={() => { setShowAddForm(false); setCharDraft(emptyDraft()); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Character list */}
                {characters.map((c) => (
                  <CharacterCard key={c.id} character={c} onDelete={handleRemoveCharacter} />
                ))}

                {characters.length === 0 && !showAddForm && (
                  <div className="text-center py-8">
                    <Users size={24} className="text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 mb-2">
                      Add characters with reference images.<br />
                      Use <code className="bg-zinc-800 px-1 rounded">@handle</code> in your script.
                    </p>
                    <Button
                      size="sm"
                      className="bg-violet-600 hover:bg-violet-700 text-white text-xs"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus size={12} /> Add First Character
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Script content ────────────────────────────────────── */}
            {activeTab === "script" && (
              <div className="flex flex-col h-full">
                {/* Handle badges */}
                {knownHandles.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-3 pt-3">
                    {knownHandles.map((h) => (
                      <span key={h} className="text-[9px] bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded-full">
                        @{h}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex-1 p-3">
                  <textarea
                    placeholder={`Paste your full script here.\n\nEpisode 1: Picnic Plans\n[Scene: Bright sunny morning.]\n@ru-du bounces excitedly.\nRu-Du: "Today's the day!"\n[Audio: Birds chirping]`}
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="w-full h-full min-h-[300px] bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  />
                </div>
                {scriptText.length > 0 && (
                  <div className="px-3 pb-2 text-[10px] text-zinc-600 text-right">
                    {scriptText.length} chars
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom action */}
          <div className="p-3 border-t border-zinc-800 flex-shrink-0">
            {!showTimeline ? (
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Parsing script...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} /> Generate Episodes
                  </span>
                )}
              </Button>
            ) : (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                  <span className="text-emerald-400">{doneCount}</span>
                  <span>/</span>
                  <span>{clips.length} episodes</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {showTimeline ? (
            /* ── Generation/Done view: Preview + Timeline ────────── */
            <>
              {/* Top: Preview + Inspector — 55% */}
              <div className="flex min-h-0 border-b border-zinc-800" style={{ height: "55%" }}>
                {/* Preview */}
                <div className="flex-1 min-w-0 flex items-center justify-center bg-zinc-950 p-3">
                  <div className="w-full max-w-2xl h-full flex items-center">
                    <PreviewPlayer clips={clips} selectedClip={selectedClip} />
                  </div>
                </div>

                {/* Inspector panel */}
                <div className="w-64 flex-shrink-0 border-l border-zinc-800 bg-zinc-900/50 overflow-y-auto">
                  {selectedClip ? (
                    <div className="p-3 space-y-3">
                      <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Episode {selectedClip.order}
                      </h3>
                      <div>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Scene</span>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{selectedClip.scene_description}</p>
                      </div>
                      {selectedClip.character_handles?.length > 0 && (
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                            <Users size={9} className="text-violet-400" /> Characters
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedClip.character_handles.map((h) => (
                              <span
                                key={h}
                                className="inline-flex items-center bg-violet-500/20 text-violet-300 text-[10px] px-1.5 py-0.5 rounded-full"
                              >
                                @{h}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedClip.dialogue && (
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                            <MessageSquare size={9} className="text-violet-400" /> Dialogue
                          </span>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed italic">{selectedClip.dialogue}</p>
                        </div>
                      )}
                      {selectedClip.camera_note && (
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Camera</span>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedClip.camera_note}</p>
                        </div>
                      )}
                      {selectedClip.audio_cues && (
                        <div>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                            <Volume2 size={9} className="text-violet-400" /> Audio
                          </span>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedClip.audio_cues}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-zinc-600">Select a clip to see details</div>
                  )}
                </div>
              </div>

              {/* Bottom: Timeline — 45% */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-1.5 border-b border-zinc-800 flex items-center gap-4 flex-shrink-0">
                  <p className="text-[11px] text-zinc-500 line-clamp-1 flex-1">
                    {project.script_raw ? "Script-based project" : project.prompt}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-zinc-500 flex-shrink-0">
                    <span>{clips.length} episodes</span>
                    <span className="text-emerald-400">{doneCount} done</span>
                    <span className="text-yellow-400">
                      {clips.filter((c) => c.status === "generating").length} generating
                    </span>
                    <span className="text-red-400">
                      {clips.filter((c) => c.status === "failed").length} failed
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {clipsLoading ? (
                    <div className="flex justify-center py-6">
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
              </div>
            </>
          ) : (
            /* ── Draft view: Characters or Script in main area ───── */
            <div className="flex-1 flex flex-col overflow-y-auto">
              {activeTab === "characters" && (
                <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
                  <h2 className="text-lg font-semibold text-zinc-100 mb-1">Characters</h2>
                  <p className="text-sm text-zinc-500 mb-6">
                    Add your characters below. Reference them in your script with <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-violet-400">@handle</code>.
                  </p>

                  {/* Character cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    {characters.map((c) => (
                      <CharacterCard key={c.id} character={c} onDelete={handleRemoveCharacter} />
                    ))}
                  </div>

                  {/* Add character form (main area version) */}
                  <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-xl p-6">
                    <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
                      <Plus size={14} /> Add Character
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Ru-Du"
                          value={charDraft.name}
                          onChange={(e) => setCharDraft((p) => ({ ...p, name: e.target.value }))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                        {charDraft.name && (
                          <p className="text-xs text-violet-400 mt-1">
                            Handle: @{charDraft.name.toLowerCase().trim().replace(/\s+/g, "-")}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                        <Textarea
                          placeholder="Appearance: hair, clothing, features..."
                          value={charDraft.description}
                          onChange={(e) => setCharDraft((p) => ({ ...p, description: e.target.value }))}
                          className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm min-h-[80px]"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Reference Images</label>
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDraggingImages(true); }}
                          onDragLeave={() => setDraggingImages(false)}
                          onDrop={(e) => { e.preventDefault(); setDraggingImages(false); addCharImages(e.dataTransfer.files); }}
                          onClick={() => document.getElementById("main-char-img")?.click()}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 cursor-pointer transition-all ${
                            draggingImages
                              ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
                              : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800/70"
                          }`}
                        >
                          <ImageIcon size={20} className={draggingImages ? "text-violet-400" : "text-zinc-500"} />
                          <div className="text-center">
                            <p className="text-sm text-zinc-300">Drop reference images here</p>
                            <p className="text-xs text-zinc-500 mt-0.5">or click to browse — PNG, JPG, WebP, GIF</p>
                          </div>
                          <input id="main-char-img" type="file" accept="image/*" multiple onChange={handleCharImageFiles} className="hidden" />
                        </div>
                        {charDraft.imagePreviews.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {charDraft.imagePreviews.map((url, i) => (
                              <div key={i} className="relative group">
                                <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-zinc-700" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeCharImage(i); }}
                                  className="absolute -top-1.5 -right-1.5 bg-zinc-900 border border-zinc-700 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X size={10} className="text-red-400" />
                                </button>
                              </div>
                            ))}
                            <span className="text-xs text-zinc-500 self-center ml-1">{charDraft.imagePreviews.length} image{charDraft.imagePreviews.length !== 1 ? "s" : ""}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                        onClick={handleAddCharacter}
                        disabled={addingChar || !charDraft.name.trim()}
                      >
                        {addingChar ? "Adding..." : "Add Character"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "script" && (
                <div className="flex-1 flex flex-col p-8 max-w-4xl mx-auto w-full">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-100 mb-1">Script</h2>
                      <p className="text-sm text-zinc-500">
                        Write your episodes. Use @handles to reference characters.
                      </p>
                    </div>
                    {knownHandles.length > 0 && (
                      <div className="flex gap-1.5">
                        {knownHandles.map((h) => (
                          <span key={h} className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-1 rounded-full">
                            @{h}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <textarea
                    placeholder={`Episode 1: Picnic Plans\n[Scene: Bright sunny morning. Kitchen with a large window.]\n@ru-du bounces excitedly near a picnic basket on the table.\n@shy-sha peeks from behind the door, holding a stuffed bear.\nRu-Du: "Today's the day! Picnic day!"\nShy-Sha: "I packed Mr. Bear... just in case."\n[Camera: Wide shot of kitchen, slow zoom to the basket]\n[Audio: Birds chirping, cheerful morning music]\n\nEpisode 2: Rain Begins\n[Scene: Same kitchen. Sky darkens through the window.]\n...`}
                    value={scriptText}
                    onChange={(e) => setScriptText(e.target.value)}
                    className="flex-1 w-full min-h-[400px] bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-sm text-zinc-100 placeholder:text-zinc-600 font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                  />

                  <div className="flex items-center justify-between mt-3">
                    {characters.length === 0 && (
                      <p className="text-xs text-amber-400/80">
                        Add characters first, then reference them with @handle in your script.
                      </p>
                    )}
                    {scriptText.length > 0 && (
                      <p className="text-xs text-zinc-600 ml-auto">{scriptText.length} chars</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
