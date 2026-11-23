import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import {
  BookOpen,
  Search,
  Plus,
  Star,
  GitFork,
  Circle,
  GitBranch,
} from "lucide-react";

export const RepoListPage = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const isTeamLead = normalizedRole === "team_lead" || normalizedRole === "owner";

  const [repos, setRepos] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const fetchRepos = () => {
    setLoading(true);
    api.get("/repos")
      .then((res) => setRepos(res.data.data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleCreateRepo = async (e) => {
    e.preventDefault();
    setError("");
    setCreateLoading(true);
    try {
      await api.post("/repos", {
        name,
        description,
        stageRules: [
          { pattern: "src/auth/", stage: "AUTH_REVIEW" },
          { pattern: "src/models/", stage: "DB_REVIEW" },
          { pattern: "infrastructure/", stage: "INFRA_REVIEW" },
        ],
      });
      setIsModalOpen(false);
      setName("");
      setDescription("");
      fetchRepos();
    } catch (err) {
      setError(err.message || "Failed to create repository");
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#0d1117] min-h-screen text-[#e6edf3]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* GitHub Filter & New Repo Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#30363d]">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Find a repository..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-[#161b22] border border-[#30363d] rounded-md text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
              <Search className="w-3.5 h-3.5 text-[#7d8590] absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {isTeamLead ? (
            <Button
              variant="primary"
              size="md"
              icon={BookOpen}
              onClick={() => setIsModalOpen(true)}
            >
              New
            </Button>
          ) : (
            <div className="text-xs text-[#7d8590] flex items-center gap-2 font-mono px-3 py-1.5 rounded-md bg-[#161b22] border border-[#30363d]">
              <span className="w-2 h-2 rounded-full bg-[#58a6ff]"></span>
              Role: <span className="text-[#e6edf3] font-semibold uppercase">{user?.role}</span> (Repositories via Team Lead Invite)
            </div>
          )}
        </div>

        {/* GitHub Repository List */}
        {loading ? (
          <div className="text-center py-16 text-[#7d8590] font-mono text-xs">
            Loading repositories...
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="border border-[#30363d] rounded-md p-12 text-center bg-[#161b22] space-y-3">
            <BookOpen className="w-10 h-10 text-[#7d8590] mx-auto" />
            <h3 className="font-semibold text-sm text-[#e6edf3]">No repositories found</h3>
            <p className="text-xs text-[#7d8590] max-w-sm mx-auto">
              Create your first repository with automated DAG reviews and pre-checks.
            </p>
            <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
              New repository
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d] border-t border-[#21262d]">
            {filteredRepos.map((repo) => (
              <div
                key={repo._id}
                className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/repos/${repo._id}`}
                      className="text-base font-semibold text-[#58a6ff] hover:underline"
                    >
                      {repo.name}
                    </Link>
                    <span className="text-[11px] font-normal px-2 py-0.2 rounded-full border border-[#30363d] text-[#7d8590]">
                      Public
                    </span>
                  </div>

                  <p className="text-xs text-[#7d8590] max-w-2xl leading-relaxed">
                    {repo.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#7d8590] pt-1 flex-wrap">
                    {repo.primaryLanguage && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <Circle
                          className="w-2.5 h-2.5"
                          style={{
                            fill: repo.primaryLanguage.color || "#f1e05a",
                            color: repo.primaryLanguage.color || "#f1e05a",
                          }}
                        />
                        <span className="text-[#c9d1d9]">{repo.primaryLanguage.name}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <GitBranch className="w-3.5 h-3.5" />
                      {repo.branchNames && repo.branchNames.length > 0
                        ? repo.branchNames.join(", ")
                        : "main"}
                    </span>
                    <span>
                      Updated {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : "recently"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/repos/${repo._id}`}>
                    <Button size="sm" variant="secondary">
                      View code
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GitHub New Repo Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create a new repository"
        subtitle="A repository contains all project files, DAG stages, and revision history."
      >
        <form onSubmit={handleCreateRepo} className="space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149]">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#e6edf3] mb-1">
              Repository name <span className="text-[#f85149]">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-service"
              className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#e6edf3] mb-1">
              Description <span className="text-[#7d8590] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this project"
              className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
            />
          </div>

          <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d] text-[#7d8590] space-y-1">
            <span className="font-semibold text-[#e6edf3] block">Default Branch Strategy</span>
            <p className="text-[11px]">
              Waypoint will automatically create <code className="text-[#58a6ff]">main</code> and{" "}
              <code className="text-[#58a6ff]">develop</code> branches with automated review stage policies.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={createLoading}>
              Create repository
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
