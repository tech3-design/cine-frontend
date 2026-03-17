"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PromptPanel } from "@/components/PromptPanel";
import { listProjects } from "@/lib/api";
import type { Project } from "@/lib/types";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Film, Clock, ChevronRight } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-700 text-zinc-300",
  planning: "bg-blue-500/20 text-blue-400",
  generating: "bg-yellow-500/20 text-yellow-400",
  done: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    listProjects().then((d) => setProjects(d.projects));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <Film className="text-violet-400" size={22} />
        <h1 className="text-lg font-semibold text-zinc-100">CineAI</h1>
        <span className="text-xs text-zinc-500 ml-1">Long-Form AI Video Composer</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* New project */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
            New Project
          </h2>
          <PromptPanel />
        </section>

        {/* Recent projects */}
        {projects.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
              Recent Projects
            </h2>
            <div className="space-y-2">
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-5 py-4 transition-colors cursor-pointer">
                    <Film size={18} className="text-zinc-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100 truncate">{p.title}</span>
                        <Badge className={`text-[10px] px-1.5 ${STATUS_COLORS[p.status] ?? ""}`}>
                          {p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{p.prompt}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 flex-shrink-0">
                      <Clock size={12} />
                      {formatDuration(p.duration)}
                    </div>
                    <ChevronRight size={16} className="text-zinc-600" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
