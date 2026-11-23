import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import {
  GitPullRequest,
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  Search,
} from "lucide-react";

export const DashboardPage = () => {
  const { user } = useAuth();
  const normalizedRole = (user?.role || "").toLowerCase();
  const isTeamLead = normalizedRole === "team_lead" || normalizedRole === "owner";
  const isReviewer = normalizedRole === "reviewer" || normalizedRole === "developer_reviewer";
  const isDualRole = normalizedRole === "developer_reviewer";

  const [activeRoleView, setActiveRoleView] = useState(
    isTeamLead ? "teamlead" : isReviewer ? "reviewer" : "developer"
  );

  // Automatically switch dashboard view when user role is loaded/changed
  useEffect(() => {
    if (user?.role) {
      const role = user.role.toLowerCase();
      if (role === "team_lead" || role === "owner") {
        setActiveRoleView("teamlead");
      } else if (role === "reviewer" || role === "developer_reviewer") {
        setActiveRoleView("reviewer");
      } else {
        setActiveRoleView("developer");
      }
    }
  }, [user?.role]);

  const [devData, setDevData] = useState(null);
  const [reviewerData, setReviewerData] = useState(null);
  const [teamLeadData, setTeamLeadData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [repoSearch, setRepoSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/repos")
      .then((res) => {
        const rList = res.data.data || [];
        setRepos(rList);
        if (rList.length > 0) setSelectedRepoId(rList[0]._id);
      })
      .catch((e) => console.error("Error loading repos", e));
  }, []);

  useEffect(() => {
    setLoading(true);
    if (activeRoleView === "developer") {
      api.get("/dashboard/developer")
        .then((res) => setDevData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (activeRoleView === "reviewer") {
      api.get("/dashboard/reviewer")
        .then((res) => setReviewerData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (activeRoleView === "teamlead" && selectedRepoId) {
      api.get(`/dashboard/teamlead/${selectedRepoId}`)
        .then((res) => setTeamLeadData(res.data.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeRoleView, selectedRepoId]);

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="bg-[#0d1117] min-h-screen text-[#e6edf3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* ── LEFT SIDEBAR (GitHub Repositories Sidebar) ── */}
          <aside className="space-y-4">
            <div className="flex items-center justify-between text-xs pb-1">
              <span className="font-semibold text-[#e6edf3]">Top Repositories</span>
              {isTeamLead && (
                <Link to="/repos">
                  <Button size="sm" variant="primary" icon={Plus}>
                    New
                  </Button>
                </Link>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Find a repository..."
                value={repoSearch}
                onChange={(e) => setRepoSearch(e.target.value)}
                className="w-full h-7 pl-7 pr-3 text-xs bg-[#161b22] border border-[#30363d] rounded-md text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
              />
              <Search className="w-3.5 h-3.5 text-[#7d8590] absolute left-2 top-2 pointer-events-none" />
            </div>

            <ul className="space-y-1 text-xs">
              {filteredRepos.length === 0 ? (
                <li className="text-[#7d8590] italic py-2">No repositories found</li>
              ) : (
                filteredRepos.map((repo) => (
                  <li key={repo._id}>
                    <Link
                      to={`/repos/${repo._id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#161b22] text-[#c9d1d9] hover:text-[#58a6ff] transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#7d8590] shrink-0" />
                      <span className="truncate">{repo.name}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>

            {/* Quick Filter Shortcuts */}
            <div className="pt-4 border-t border-[#30363d] space-y-2 text-xs">
              <span className="font-semibold text-[#7d8590] block text-[11px] uppercase tracking-wider">
                Workspaces
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveRoleView("developer")}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors ${
                    activeRoleView === "developer"
                      ? "bg-[#21262d] text-white font-semibold"
                      : "text-[#c9d1d9] hover:bg-[#161b22]"
                  }`}
                >
                  <span>My Pull Requests</span>
                  <span className="text-[10px] text-[#7d8590] font-mono">
                    {devData?.recentPRs?.length || 0}
                  </span>
                </button>
                <button
                  onClick={() => setActiveRoleView("reviewer")}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors ${
                    activeRoleView === "reviewer"
                      ? "bg-[#21262d] text-white font-semibold"
                      : "text-[#c9d1d9] hover:bg-[#161b22]"
                  }`}
                >
                  <span>Review Queue</span>
                  <span className="text-[10px] text-[#7d8590] font-mono">
                    {reviewerData?.assignedCount || 0}
                  </span>
                </button>
                <button
                  onClick={() => setActiveRoleView("teamlead")}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors ${
                    activeRoleView === "teamlead"
                      ? "bg-[#21262d] text-white font-semibold"
                      : "text-[#c9d1d9] hover:bg-[#161b22]"
                  }`}
                >
                  <span>Team Fairness & SLA</span>
                  <span className="text-[10px] text-[#7d8590] font-mono">Lead</span>
                </button>
              </div>
            </div>
          </aside>

          {/* ── RIGHT MAIN CONTENT (GitHub Feed Area) ── */}
          <main className="lg:col-span-3 space-y-6">
            {/* Header switcher line */}
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d] flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-[#e6edf3]">
                    {activeRoleView === "developer"
                      ? "Developer Workspace"
                      : activeRoleView === "reviewer"
                      ? "Reviewer Workspace"
                      : "Team Lead Governance"}
                  </h1>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                      isTeamLead
                        ? "bg-[rgba(168,85,247,0.15)] text-[#c084fc] border-[rgba(168,85,247,0.4)]"
                        : isDualRole
                        ? "bg-[rgba(234,179,8,0.15)] text-[#eab308] border-[rgba(234,179,8,0.4)]"
                        : isReviewer
                        ? "bg-[rgba(46,160,67,0.15)] text-[#3fb950] border-[rgba(46,160,67,0.4)]"
                        : "bg-[rgba(56,139,253,0.15)] text-[#58a6ff] border-[rgba(56,139,253,0.4)]"
                    }`}
                  >
                    {isTeamLead ? "Team Lead" : isDualRole ? "Dev & Reviewer" : isReviewer ? "Reviewer" : "Developer"}
                  </span>
                </div>
                <p className="text-xs text-[#7d8590] mt-1">
                  Signed in as <strong className="text-[#e6edf3]">@{user?.username}</strong> {user?.fullName ? `(${user.fullName})` : ""}
                </p>
              </div>

              {activeRoleView === "teamlead" && repos.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7d8590] font-medium">Governance Target:</span>
                  <select
                    value={selectedRepoId}
                    onChange={(e) => setSelectedRepoId(e.target.value)}
                    className="h-8 px-2.5 bg-[#161b22] border border-[#30363d] rounded-md text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                  >
                    {repos.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* ── DEVELOPER TAB ── */}
            {activeRoleView === "developer" && (
              <div className="space-y-4">
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
                  <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590]">
                    <span className="font-semibold text-[#e6edf3]">Your active pull requests</span>
                    <span>Total created: {devData?.totalCreated || 0}</span>
                  </div>

                  <div className="divide-y divide-[#21262d]">
                    {(!devData?.recentPRs || devData.recentPRs.length === 0) ? (
                      <div className="p-8 text-center text-[#7d8590]">
                        No active pull requests. Create a feature branch and open a PR.
                      </div>
                    ) : (
                      devData.recentPRs.map((pr) => (
                        <div
                          key={pr._id}
                          className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#161b22]/60 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <GitPullRequest className="w-4 h-4 text-[#3fb950] mt-0.5 shrink-0" />
                            <div>
                              <Link
                                to={`/pr/${pr._id}`}
                                className="font-semibold text-xs text-[#e6edf3] hover:text-[#58a6ff]"
                              >
                                #{pr.prNumber || pr._id.slice(-4)} {pr.title}
                              </Link>
                              <div className="text-[11px] text-[#7d8590] mt-0.5">
                                {pr.repoId?.name} •{" "}
                                <span className="font-mono">{pr.fromBranch?.name}</span> ➔{" "}
                                <span className="font-mono">{pr.toBranch?.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge status={pr.status} />
                            <Link to={`/pr/${pr._id}`}>
                              <Button size="sm" variant="secondary">
                                View
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── REVIEWER TAB ── */}
            {activeRoleView === "reviewer" && (
              <div className="space-y-4">
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
                  <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590]">
                    <span className="font-semibold text-[#e6edf3]">
                      Awaiting your review ({reviewerData?.pendingReviews?.length || 0})
                    </span>
                    <span className="text-[#3fb950] font-mono">
                      Completed reviews: {reviewerData?.completedCount || 0}
                    </span>
                  </div>

                  <div className="divide-y divide-[#21262d]">
                    {(!reviewerData?.pendingReviews || reviewerData.pendingReviews.length === 0) ? (
                      <div className="p-8 text-center text-[#7d8590]">
                        You are all caught up! No reviews are currently waiting for your input.
                      </div>
                    ) : (
                      reviewerData.pendingReviews.map((stage) => (
                        <div
                          key={stage._id}
                          className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#161b22]/60 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded border border-[#30363d] bg-[#161b22] text-[#58a6ff]">
                                {stage.stageType}
                              </span>
                              <Link
                                to={`/pr/${stage.prId?._id}`}
                                className="font-semibold text-xs text-[#e6edf3] hover:text-[#58a6ff]"
                              >
                                {stage.prId?.title || "Pull request"}
                              </Link>
                            </div>
                            <div className="text-[11px] text-[#7d8590] mt-0.5">
                              Repo: {stage.repoId?.name}
                              {stage.slaDeadline && (
                                <span className="ml-3 font-mono text-[#d29922]">
                                  SLA: {new Date(stage.slaDeadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                          </div>

                          <Link to={`/pr/${stage.prId?._id}`}>
                            <Button size="sm" variant="primary">
                              Review
                            </Button>
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TEAM LEAD & FAIRNESS TAB ── */}
            {activeRoleView === "teamlead" && (
              <div className="space-y-4 text-xs">
                {/* Active Escalation Alerts */}
                {teamLeadData?.escalations?.length > 0 && (
                  <div className="border border-[rgba(248,81,73,0.4)] rounded-md bg-[rgba(248,81,73,0.1)] p-4 space-y-2">
                    <span className="font-semibold text-sm text-[#f85149] block">
                      SLA Escalation Alerts ({teamLeadData.escalations.length})
                    </span>
                    <div className="space-y-1.5">
                      {teamLeadData.escalations.map((esc) => (
                        <div
                          key={esc._id}
                          className="p-2.5 rounded bg-[#161b22] border border-[#30363d] flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-[#e6edf3]">{esc.stageType}</span>
                            <span className="text-[#7d8590] ml-2">in {esc.prId?.title}</span>
                            <span className="block text-[11px] text-[#f85149] font-mono mt-0.5">
                              Breached deadline • Escalated {esc.escalationCount}x
                            </span>
                          </div>
                          <Link to={`/pr/${esc.prId?._id}`}>
                            <Button size="sm" variant="danger">
                              Intervene
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workload Table (GitHub Primer style) */}
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590]">
                    <span className="font-semibold text-[#e6edf3]">Reviewer Workload Fairness</span>
                    <span>ML dynamically routes to engineers with fewer open reviews</span>
                  </div>

                  <div className="divide-y divide-[#21262d]">
                    {teamLeadData?.reviewerWorkload?.map((m) => (
                      <div key={m.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-[10px] text-[#58a6ff]">
                            {m.fullName[0]}
                          </div>
                          <span className="font-semibold text-[#e6edf3]">{m.fullName}</span>
                          <span className="text-[#7d8590] font-mono">({m.username})</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[11px] text-[#7d8590]">
                            <strong>{m.currentOpenReviews}</strong> open reviews
                          </span>
                          <div className="w-24 h-1.5 rounded-full bg-[#21262d] overflow-hidden">
                            <div
                              className={`h-full ${
                                m.currentOpenReviews > 2 ? "bg-[#d29922]" : "bg-[#238636]"
                              }`}
                              style={{ width: `${Math.min(100, (m.currentOpenReviews / 4) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
