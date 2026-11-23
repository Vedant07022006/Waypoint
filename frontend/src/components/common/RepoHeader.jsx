import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BookOpen,
  Code2,
  GitPullRequest,
  Shield,
  Clock,
  Users,
} from "lucide-react";

export const RepoHeader = ({ repo, prCount = 0 }) => {
  const location = useLocation();
  const repoId = repo?._id;
  const currentTab = new URLSearchParams(location.search).get("tab") || "code";

  const tabs = [
    { id: "code", label: "Code", path: `/repos/${repoId}`, icon: Code2 },
    { id: "prs", label: "Pull requests", path: `/repos/${repoId}?tab=prs`, icon: GitPullRequest, count: prCount },
    { id: "collaborators", label: "Collaborators", path: `/repos/${repoId}?tab=collaborators`, icon: Users, count: repo?.members?.length || 1 },
    { id: "sla", label: "SLA Policy", path: `/repos/${repoId}?tab=sla`, icon: Clock },
    { id: "dag", label: "Security & DAG", path: `/repos/${repoId}?tab=dag`, icon: Shield },
  ];

  return (
    <div className="bg-[#010409] border-b border-[#30363d] pt-4 text-[#e6edf3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        {/* Repo Title */}
        <div className="flex items-center gap-2 flex-wrap text-base font-semibold pb-4">
          <BookOpen className="w-4 h-4 text-[#7d8590]" />
          <Link to="/repos" className="text-[#58a6ff] hover:underline">
            {repo?.ownerId?.username || "waypoint"}
          </Link>
          <span className="text-[#7d8590]">/</span>
          <Link to={`/repos/${repoId}`} className="text-[#58a6ff] hover:underline font-bold">
            {repo?.name || "repository"}
          </Link>
          <span className="text-[11px] font-normal px-2 py-0.5 rounded-full border border-[#30363d] text-[#7d8590]">
            Public
          </span>
        </div>

        {/* GitHub Subnav Tabs */}
        <nav className="flex items-center gap-1 -mb-[1px] overflow-x-auto">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isSelected = tab.id === currentTab;
            return (
              <Link
                key={idx}
                to={tab.path}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isSelected
                    ? "border-[#f78166] text-[#e6edf3] font-semibold"
                    : "border-transparent text-[#7d8590] hover:text-[#e6edf3] hover:border-[#8b949e]"
                }`}
              >
                <Icon className="w-4 h-4 text-[#7d8590]" />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#30363d] text-[#c9d1d9]">
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
