"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Plus, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listProjects, createProject, deleteProject } from "@/lib/api";
import { toast } from "sonner";
import { formatDuration } from "@/lib/utils";
import type { Project } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  planning: "bg-blue-500/20 text-blue-400",
  generating: "bg-yellow-500/20 text-yellow-400",
  done: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    listProjects()
      .then((d) => setProjects(d.projects))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Enter a project title");
      return;
    }
    setCreating(true);
    try {
      const project = await createProject({
        title: newTitle.trim(),
        prompt: "Script-based project",
        duration: 60,
      });
      toast.success("Project created");
      router.push(`/dashboard/${project.id}`);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <Film className="text-violet-400" size={22} />
        <h1 className="text-lg font-semibold text-zinc-100">CineAI</h1>
        <span className="text-xs text-zinc-500 ml-1">AI Video Composer</span>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-semibold text-zinc-100">Projects</h2>
          <Button
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} className="mr-1.5" /> New Project
          </Button>
        </div>

        {/* New project inline form */}
        {showNew && (
          <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-end gap-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1.5 block">Project Title</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Rainy Day Treasure"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Create
            </Button>
            <Button
              variant="outline"
              className="border-zinc-700 text-zinc-400"
              onClick={() => {
                setShowNew(false);
                setNewTitle("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-20">
            <Film size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">No projects yet. Create your first one!</p>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => setShowNew(true)}
            >
              <Plus size={16} className="mr-1.5" /> New Project
            </Button>
          </div>
        )}

        {/* Project cards grid */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/dashboard/${p.id}`)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-900/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-100 truncate flex-1 mr-2">
                    {p.title}
                  </h3>
                  <Badge className={`text-[10px] px-1.5 flex-shrink-0 ${STATUS_COLORS[p.status] ?? ""}`}>
                    {p.status}
                  </Badge>
                </div>
                {p.prompt && (
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{p.prompt}</p>
                )}
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {formatDuration(p.duration)}
                  </span>
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
