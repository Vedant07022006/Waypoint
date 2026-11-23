import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { Modal } from "../components/common/Modal";
import { CreatePRModal } from "../components/pr/CreatePRModal";
import { RepoHeader } from "../components/common/RepoHeader";
import { computeLanguages } from "../utils/languageDetector";
import {
  GitBranch,
  GitPullRequest,
  Plus,
  FileCode,
  Folder,
  Clock,
  CheckCircle2,
  GitCommit,
  ChevronDown,
  ShieldCheck,
  ArrowRight,
  GitMerge,
  Users,
  UserPlus,
  Trash2,
  Search,
  AlertCircle,
  Shield,
  Upload,
} from "lucide-react";

export const RepoDetailPage = () => {
  const { repoId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [repo, setRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [prs, setPRs] = useState([]);
  const [members, setMembers] = useState([]);
  const [slaConfig, setSLAConfig] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "code"); // "code" | "prs" | "collaborators" | "sla"
  const [loading, setLoading] = useState(true);

  // Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Forms & State
  const [newBranchName, setNewBranchName] = useState("");
  const [branchError, setBranchError] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [creatingPR, setCreatingPR] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null); // { id, name }
  const [removeMemberError, setRemoveMemberError] = useState("");
  const [removingMember, setRemovingMember] = useState(false);

  // Collaborator search & invite
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const isOwner =
    repo?.ownerId?._id === user?._id ||
    repo?.ownerId === user?._id;

  const isTeamLead =
    user?.role?.toLowerCase() === "team_lead" ||
    user?.role?.toLowerCase() === "owner" ||
    isOwner;

  const loadData = async () => {
    setLoading(true);
    try {
      const [repoRes, branchRes, prRes, slaRes, memberRes] = await Promise.all([
        api.get(`/repos/${repoId}`),
        api.get(`/repos/${repoId}/branches`),
        api.get(`/repos/${repoId}/pullrequests`),
        api.get(`/repos/${repoId}/sla`).catch(() => ({ data: { data: null } })),
        api.get(`/repos/${repoId}/members`).catch(() => ({ data: { data: [] } })),
      ]);
      setRepo(repoRes.data.data);
      const bList = branchRes.data.data || [];
      setBranches(bList);
      setSelectedBranch((prev) => {
        if (prev) {
          const match = bList.find((b) => b._id === prev._id);
          if (match) return match;
        }
        return (
          bList.find((b) => b.name === "main") ||
          bList.find((b) => b.name === "develop") ||
          bList[0] ||
          null
        );
      });
      setPRs(prRes.data.data || []);
      setSLAConfig(slaRes.data?.data);
      setMembers(memberRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [repoId]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "code" ? {} : { tab });
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setBranchError("");
    setCreatingBranch(true);

    const formattedName = `feature/${newBranchName.trim()}`;
    try {
      await api.post(`/repos/${repoId}/branches`, {
        name: formattedName,
        sourceBranch: selectedBranch?.name || "main",
      });
      setIsBranchModalOpen(false);
      setNewBranchName("");
      loadData();
    } catch (err) {
      setBranchError(err.message || "Failed to create branch");
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleCreatePR = async (prData) => {
    setCreatingPR(true);
    try {
      const res = await api.post(`/repos/${repoId}/pullrequests`, prData);
      setIsPRModalOpen(false);
      navigate(`/pr/${res.data.data._id}`);
    } catch (err) {
      // Re-throw so CreatePRModal displays the error cleanly inside its own UI
      throw err;
    } finally {
      setCreatingPR(false);
    }
  };

  // Search users for invite
  const handleSearchUsers = async (query) => {
    setUserQuery(query);
    setSearchingUsers(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Open invite modal and load initial candidates
  const openInviteModal = () => {
    setInviteError("");
    setInviteSuccess("");
    setUserQuery("");
    setIsInviteModalOpen(true);
    handleSearchUsers("");
  };

  const handleInviteUser = async (targetUser) => {
    setInvitingId(targetUser._id);
    setInviteError("");
    setInviteSuccess("");
    try {
      await api.post(`/repos/${repoId}/members`, { userId: targetUser._id });
      setInviteSuccess(`${targetUser.fullName || targetUser.username} added as a collaborator!`);
      // Reload members list
      const memberRes = await api.get(`/repos/${repoId}/members`);
      setMembers(memberRes.data?.data || []);
    } catch (err) {
      setInviteError(err.message || "Failed to invite user");
    } finally {
      setInvitingId(null);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    setRemoveMemberError("");
    try {
      await api.delete(`/repos/${repoId}/members/${memberToRemove.id}`);
      const memberRes = await api.get(`/repos/${repoId}/members`);
      setMembers(memberRes.data?.data || []);
      setMemberToRemove(null);
    } catch (err) {
      setRemoveMemberError(err.message || "Could not remove member");
    } finally {
      setRemovingMember(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-[#7d8590] font-mono text-xs">
        Loading repository...
      </div>
    );
  }

  const openPRCount = prs.filter(
    (p) => p.status === "REVIEW_PENDING" || p.status === "PRECHECK_RUNNING" || p.status === "APPROVED"
  ).length;

  const { languages: branchLanguages } = computeLanguages(selectedBranch?.files || []);

  return (
    <div className="bg-[#0d1117] min-h-screen text-[#e6edf3]">
      {/* 1. Subheader Breadcrumbs */}
      <RepoHeader repo={repo} prCount={openPRCount} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Navigation Switcher Tabs */}
        <div className="flex items-center justify-between pb-2 border-b border-[#30363d] flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleTabChange("code")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "code" ? "bg-[#21262d] text-white" : "text-[#7d8590] hover:text-[#e6edf3]"
              }`}
            >
              Code Explorer
            </button>
            <button
              onClick={() => handleTabChange("prs")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "prs" ? "bg-[#21262d] text-white" : "text-[#7d8590] hover:text-[#e6edf3]"
              }`}
            >
              Pull Requests ({prs.length})
            </button>
            <button
              onClick={() => handleTabChange("collaborators")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "collaborators" ? "bg-[#21262d] text-white" : "text-[#7d8590] hover:text-[#e6edf3]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Collaborators ({members.length})
            </button>
            <button
              onClick={() => handleTabChange("sla")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "sla" ? "bg-[#21262d] text-white" : "text-[#7d8590] hover:text-[#e6edf3]"
              }`}
            >
              SLA Engine Config
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" icon={GitBranch} onClick={() => setIsBranchModalOpen(true)}>
              New branch
            </Button>
            <Button size="sm" variant="primary" icon={GitPullRequest} onClick={() => setIsPRModalOpen(true)}>
              New pull request
            </Button>
          </div>
        </div>

        {/* ── 1. CODE VIEW TAB ── */}
        {activeTab === "code" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left 3 cols: File Browser & README */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] text-xs font-medium text-[#c9d1d9] shadow-sm">
                    <GitBranch className="w-3.5 h-3.5 text-[#7d8590]" />
                    <select
                      value={selectedBranch?._id || ""}
                      onChange={(e) => {
                        const found = branches.find((b) => b._id === e.target.value);
                        setSelectedBranch(found);
                      }}
                      className="bg-transparent text-[#e6edf3] font-mono text-xs focus:outline-none cursor-pointer"
                    >
                      {branches.map((b) => (
                        <option key={b._id} value={b._id} className="bg-[#161b22] text-[#e6edf3]">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <span className="text-xs text-[#7d8590] font-mono">
                    <strong>{branches.length}</strong> branches
                  </span>
                </div>

                {selectedBranch && (
                  <div className="flex items-center gap-2">
                    <Link to={`/repos/${repoId}/branches/${selectedBranch._id}/code?action=upload`}>
                      <Button size="sm" variant="secondary" icon={Upload}>
                        Upload files
                      </Button>
                    </Link>
                    <Link to={`/repos/${repoId}/branches/${selectedBranch._id}/code`}>
                      <Button size="sm" variant="secondary" icon={FileCode}>
                        Edit / Commit Files
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* File Table */}
              <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
                <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590]">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-[10px] text-[#58a6ff]">
                      {(repo?.ownerId?.username || "A")[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#e6edf3]">
                      {repo?.ownerId?.username || "developer"}
                    </span>
                    <span className="text-[#c9d1d9] truncate max-w-md">
                      Branch snapshot with automated DAG rules
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#7d8590]">
                    Branch: <strong className="text-[#58a6ff]">{selectedBranch?.name}</strong>
                  </span>
                </div>

                <div className="divide-y divide-[#21262d]">
                  {(!selectedBranch?.files || selectedBranch.files.length === 0) ? (
                    <div className="p-8 text-center text-[#7d8590] italic">
                      No files found in this branch. Click &ldquo;Edit / Commit Files&rdquo; to add files.
                    </div>
                  ) : (
                    selectedBranch.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 flex items-center justify-between hover:bg-[#161b22]/70 transition-colors"
                      >
                        <Link
                          to={`/repos/${repoId}/branches/${selectedBranch._id}/code`}
                          className="flex items-center gap-2.5 text-[#58a6ff] hover:underline"
                        >
                          <FileCode className="w-4 h-4 text-[#7d8590]" />
                          <span className="font-mono text-xs">{file.path}</span>
                        </Link>
                        <span className="text-[11px] font-mono text-[#7d8590]">
                          {(file.content || "").split("\n").length} lines
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Readme Box */}
              <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
                <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] font-semibold text-[#e6edf3] flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-[#7d8590]" />
                  <span>README.md</span>
                </div>
                <div className="p-6 prose prose-invert max-w-none text-xs leading-relaxed space-y-3">
                  <h3 className="text-base font-bold text-[#e6edf3]">{repo?.name}</h3>
                  <p className="text-[#7d8590]">{repo?.description || "No description provided."}</p>
                  <div className="p-3 bg-[#161b22] rounded border border-[#30363d] text-[11px] font-mono text-[#7d8590]">
                    Stage Rules: {repo?.stageRules?.map((r) => `${r.pattern} ➔ ${r.stageType || r.stage}`).join(" | ")}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 1 col: GitHub-style About & Languages Sidebar */}
            <div className="space-y-4">
              <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-4 text-xs space-y-3">
                <h3 className="font-semibold text-sm text-[#e6edf3]">About</h3>
                <p className="text-[#7d8590] leading-relaxed">
                  {repo?.description || "No description provided."}
                </p>
                <div className="pt-2 border-t border-[#21262d] space-y-2 text-[#7d8590]">
                  <div className="flex items-center justify-between">
                    <span>Visibility:</span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-[#30363d] text-[#7d8590]">Public</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Default branch:</span>
                    <strong className="text-[#58a6ff] font-mono">main</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branches:</span>
                    <strong className="text-[#e6edf3]">{branches.length}</strong>
                  </div>
                </div>
              </div>

              {/* GitHub Languages Distribution Widget */}
              <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-4 text-xs space-y-3">
                <h3 className="font-semibold text-sm text-[#e6edf3]">Languages</h3>
                {branchLanguages && branchLanguages.length > 0 ? (
                  <div className="space-y-3">
                    {/* GitHub Multi-color progress bar */}
                    <div className="h-2 rounded-full overflow-hidden flex bg-[#21262d] w-full">
                      {branchLanguages.map((l) => (
                        <div
                          key={l.name}
                          style={{ width: `${l.percentage}%`, backgroundColor: l.color }}
                          title={`${l.name}: ${l.percentage}%`}
                          className="h-full"
                        />
                      ))}
                    </div>

                    {/* Language percentages list */}
                    <div className="space-y-2 pt-1">
                      {branchLanguages.map((l) => (
                        <div key={l.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: l.color }}
                            />
                            <span className="text-[#e6edf3] font-medium">{l.name}</span>
                          </span>
                          <span className="text-[#7d8590] font-mono text-[11px]">{l.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[#7d8590] italic text-[11px] leading-relaxed">
                    No languages detected. Add code files to this branch to calculate language distribution.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 2. PULL REQUESTS TAB ── */}
        {activeTab === "prs" && (
          <div className="space-y-4">
            <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
              <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold text-[#e6edf3]">
                    <GitPullRequest className="w-4 h-4 text-[#3fb950]" />
                    <span>{openPRCount} Open</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{prs.filter((p) => p.status === "MERGED").length} Closed / Merged</span>
                  </span>
                </div>
              </div>

              <div className="divide-y divide-[#21262d]">
                {prs.length === 0 ? (
                  <div className="p-12 text-center text-[#7d8590]">
                    No pull requests created yet.
                  </div>
                ) : (
                  prs.map((pr) => {
                    const isMerged = pr.status === "MERGED";
                    const isOpen =
                      pr.status === "REVIEW_PENDING" ||
                      pr.status === "PRECHECK_RUNNING" ||
                      pr.status === "APPROVED";

                    return (
                      <div
                        key={pr._id}
                        className="px-4 py-3 flex items-start gap-3 hover:bg-[#161b22]/60 transition-colors"
                      >
                        <div className="mt-1">
                          {isMerged ? (
                            <GitMerge className="w-4 h-4 text-[#8957e5]" />
                          ) : isOpen ? (
                            <GitPullRequest className="w-4 h-4 text-[#3fb950]" />
                          ) : (
                            <GitPullRequest className="w-4 h-4 text-[#da3633]" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/pr/${pr._id}`}
                              className="font-semibold text-sm text-[#e6edf3] hover:text-[#58a6ff]"
                            >
                              {pr.title}
                            </Link>

                            {(pr.stageTypes || []).map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.2 rounded-full text-[10px] font-medium border border-[#30363d] bg-[#21262d] text-[#c9d1d9]"
                              >
                                stage: {t.replace("_REVIEW", "").toLowerCase()}
                              </span>
                            ))}
                          </div>

                          <div className="text-[11px] text-[#7d8590]">
                            #{pr.prNumber || pr._id.slice(-4)} opened on {new Date(pr.createdAt).toLocaleDateString()} by{" "}
                            <strong className="text-[#c9d1d9]">{pr.authorId?.username || "author"}</strong> •{" "}
                            <span className="font-mono text-[#58a6ff]">{pr.fromBranch?.name}</span> ➔{" "}
                            <span className="font-mono text-[#58a6ff]">{pr.toBranch?.name}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Badge status={pr.status} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 3. COLLABORATORS TAB ── */}
        {activeTab === "collaborators" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <h3 className="font-semibold text-sm text-[#e6edf3] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#58a6ff]" />
                  Repository Collaborators & Team Access
                </h3>
                <p className="text-[#7d8590] text-xs mt-0.5">
                  Only invited team members can access this project. Reviewers are automatically matched to DAG review stages by the ML engine.
                </p>
              </div>

              {isTeamLead && (
                <Button variant="primary" size="sm" icon={UserPlus} onClick={openInviteModal}>
                  Invite collaborator
                </Button>
              )}
            </div>

            {/* Collaborators Roster Table */}
            <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
              <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590] font-semibold text-[11px]">
                <span>MEMBER</span>
                <div className="flex items-center gap-8">
                  <span>ROLE</span>
                  <span className="hidden sm:inline">ACTIVE REVIEWS</span>
                  {isTeamLead && <span className="w-16 text-right">ACTION</span>}
                </div>
              </div>

              <div className="divide-y divide-[#21262d]">
                {members.length === 0 ? (
                  <div className="p-8 text-center text-[#7d8590]">No collaborators added yet.</div>
                ) : (
                  members.map((m) => {
                    const isMemberOwner =
                      m._id === repo?.ownerId?._id || m._id === repo?.ownerId;
                    const isMemberLead =
                      m.role?.toLowerCase() === "team_lead" ||
                      m._id === repo?.teamLeadId?._id ||
                      m._id === repo?.teamLeadId;

                    return (
                      <div
                        key={m._id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-[#161b22]/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-xs text-[#58a6ff]">
                            {(m.fullName || m.username || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#e6edf3] flex items-center gap-2">
                              <span>{m.fullName || m.username}</span>
                              {isMemberOwner && (
                                <span className="text-[9px] font-mono px-1.5 rounded bg-[rgba(247,129,102,0.15)] text-[#f78166] border border-[rgba(247,129,102,0.3)]">
                                  Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#7d8590]">
                              @{m.username} • {m.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          {/* Role Badge */}
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                              isMemberLead
                                ? "bg-[rgba(168,85,247,0.15)] text-[#c084fc] border border-[rgba(168,85,247,0.3)]"
                                : m.role?.toLowerCase() === "developer_reviewer"
                                ? "bg-[rgba(234,179,8,0.15)] text-[#eab308] border border-[rgba(234,179,8,0.3)]"
                                : m.role?.toLowerCase() === "reviewer"
                                ? "bg-[rgba(46,160,67,0.15)] text-[#3fb950] border border-[rgba(46,160,67,0.3)]"
                                : "bg-[rgba(56,139,253,0.15)] text-[#58a6ff] border border-[rgba(56,139,253,0.3)]"
                            }`}
                          >
                            {m.role === "developer_reviewer" ? "dev & reviewer" : (m.role || "developer")}
                          </span>

                          <span className="hidden sm:inline font-mono text-[11px] text-[#7d8590]">
                            {m.currentOpenReviews || 0} reviews
                          </span>

                          {isTeamLead && (
                            <div className="w-16 text-right">
                              {!isMemberOwner ? (
                                <button
                                  onClick={() => {
                                    setRemoveMemberError("");
                                    setMemberToRemove({ id: m._id, name: m.fullName || m.username });
                                  }}
                                  className="p-1 rounded text-[#7d8590] hover:text-[#f85149] hover:bg-[#21262d] transition-colors"
                                  title="Remove collaborator"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-[#7d8590] font-mono">—</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. SLA TAB ── */}
        {activeTab === "sla" && (
          <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-6 text-xs space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-[#e6edf3]">Review Stage SLA Policies</h3>
              <p className="text-[#7d8590] text-xs mt-0.5">
                Target turnaround times per stage type. If an assigned reviewer misses the deadline,
                the background scheduler auto-reassigns or escalates to the team lead.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {Object.entries(slaConfig?.effectiveSLAs || {}).map(([stage, hours]) => (
                <div key={stage} className="p-3.5 rounded-md border border-[#30363d] bg-[#161b22]">
                  <span className="font-mono text-[#7d8590] text-[11px] block">{stage}</span>
                  <span className="text-xl font-bold font-mono text-[#e6edf3] block mt-1">
                    {hours} hours
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}

      {/* Invite Collaborator Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite a collaborator"
        subtitle="Search registered engineers by username or email to give them access to this repository."
      >
        <div className="space-y-4 text-xs">
          {inviteError && (
            <div className="p-2.5 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}
          {inviteSuccess && (
            <div className="p-2.5 rounded bg-[rgba(46,160,67,0.15)] border border-[rgba(46,160,67,0.4)] text-[#3fb950] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          {/* Search box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={userQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
            />
            <Search className="w-3.5 h-3.5 text-[#7d8590] absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Results list */}
          <div className="border border-[#30363d] rounded-md bg-[#0d1117] max-h-56 overflow-y-auto divide-y divide-[#21262d]">
            {searchingUsers ? (
              <div className="p-4 text-center text-[#7d8590]">Searching users...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-[#7d8590]">No users found.</div>
            ) : (
              searchResults.map((candidate) => {
                const isAlreadyMember = members.some((m) => m._id === candidate._id);
                return (
                  <div
                    key={candidate._id}
                    className="p-2.5 flex items-center justify-between hover:bg-[#161b22] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-xs text-[#58a6ff]">
                        {(candidate.fullName || candidate.username || "U")[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-[#e6edf3] flex items-center gap-1.5">
                          <span>{candidate.fullName || candidate.username}</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-[#21262d] text-[#7d8590] uppercase border border-[#30363d]">
                            {candidate.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#7d8590]">
                          @{candidate.username} • {candidate.email}
                        </div>
                      </div>
                    </div>

                    {isAlreadyMember ? (
                      <span className="text-[11px] text-[#3fb950] font-mono font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Member
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="primary"
                        loading={invitingId === candidate._id}
                        onClick={() => handleInviteUser(candidate)}
                      >
                        Invite
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#30363d]">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Branch Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title="Create a branch"
        subtitle="Branches must be prefixed with 'feature/' to open pull requests into 'main' or 'develop'"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
          {branchError && (
            <div className="p-2.5 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149]">
              {branchError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-[#e6edf3] mb-1">Branch name</label>
            <div className="flex rounded-md border border-[#30363d] bg-[#0d1117] focus-within:border-[#58a6ff] focus-within:ring-1 focus-within:ring-[#58a6ff] overflow-hidden">
              <span className="inline-flex items-center px-3 bg-[#161b22] border-r border-[#30363d] text-xs font-mono text-[#7d8590] select-none">
                feature/
              </span>
              <input
                type="text"
                required
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value.replace(/^feature\//, ""))}
                placeholder="auth-oauth-rotation"
                className="w-full h-8 px-3 bg-transparent font-mono text-xs text-[#e6edf3] placeholder-[#7d8590] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
            <Button variant="ghost" onClick={() => setIsBranchModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={creatingBranch}>
              Create branch
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create PR Modal */}
      <CreatePRModal
        isOpen={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        branches={branches}
        currentBranch={selectedBranch}
        onSubmit={handleCreatePR}
        loading={creatingPR}
      />

      {/* Remove Collaborator Confirmation Modal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove collaborator"
        subtitle={`Confirm removal of ${memberToRemove?.name || "collaborator"}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {removeMemberError && (
            <div className="p-2.5 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{removeMemberError}</span>
            </div>
          )}

          <p className="text-[#c9d1d9]">
            Are you sure you want to remove <strong className="text-white">{memberToRemove?.name}</strong> from this repository?
          </p>
          <p className="text-[#7d8590] text-[11px]">
            They will lose direct commit access and will not be assigned to future DAG review stages.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
            <Button variant="ghost" onClick={() => setMemberToRemove(null)} type="button">
              Cancel
            </Button>
            <Button
              variant="secondary"
              loading={removingMember}
              onClick={handleConfirmRemoveMember}
              className="text-[#f85149] hover:bg-[rgba(248,81,73,0.15)] border-[#da3633]"
            >
              Remove collaborator
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
