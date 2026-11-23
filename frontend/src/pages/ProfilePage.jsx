import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/common/Button";
import {
  User,
  Mail,
  Shield,
  Key,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  GitCommit,
  Layers,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(user || null);
  const [repos, setRepos] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "repos" | "security"
  const [loading, setLoading] = useState(true);

  // Change Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Expertise Tags state
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);
  const [tagSuccess, setTagSuccess] = useState("");
  const [tagError, setTagError] = useState("");

  useEffect(() => {
    const fetchProfileAndRepos = async () => {
      setLoading(true);
      try {
        const [meRes, reposRes] = await Promise.all([
          api.get("/users/me").catch(() => ({ data: { data: user } })),
          api.get("/repos").catch(() => ({ data: { data: [] } })),
        ]);
        if (meRes.data?.data) {
          setProfile(meRes.data.data);
          setTags(meRes.data.data.expertiseTags || []);
        }
        setRepos(reposRes.data?.data || []);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndRepos();
  }, []);

  const handleSaveTags = async (updatedTags) => {
    const toSave = updatedTags !== undefined ? updatedTags : tags;
    setSavingTags(true);
    setTagError("");
    setTagSuccess("");
    try {
      const res = await api.patch("/users/profile", {
        expertiseTags: toSave,
      });
      const saved = res.data?.data?.expertiseTags || toSave;
      setTags(saved);
      setProfile((prev) => ({ ...prev, expertiseTags: saved }));
      setTagSuccess("Expertise tags saved successfully! ML matching will now prioritize your profile.");
      setTimeout(() => setTagSuccess(""), 4000);
    } catch (err) {
      setTagError(err.message || "Failed to save expertise tags");
    } finally {
      setSavingTags(false);
    }
  };

  const handleAddTag = (tagToAdd) => {
    const clean = (tagToAdd || newTagInput).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagError(`Tag "${clean}" is already added.`);
      return;
    }
    const updated = [...tags, clean];
    setTags(updated);
    setNewTagInput("");
    setTagError("");
    handleSaveTags(updated);
  };

  const handleRemoveTag = (tagToRemove) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    handleSaveTags(updated);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post("/users/change-password", {
        oldPassword,
        newPassword,
      });
      setPasswordSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const role = (profile?.role || "developer").toLowerCase();
  const isTeamLead = role === "team_lead" || role === "owner";
  const isReviewer = role === "reviewer";

  const roleMeta = isTeamLead
    ? {
        label: "Team Lead",
        badgeClass: "bg-[rgba(168,85,247,0.15)] text-[#c084fc] border-[rgba(168,85,247,0.4)]",
        desc: "Full administrative access: Can create repositories, invite developers and reviewers, configure SLA policies, and oversee DAG execution.",
      }
    : isReviewer
    ? {
        label: "Reviewer",
        badgeClass: "bg-[rgba(46,160,67,0.15)] text-[#3fb950] border-[rgba(46,160,67,0.4)]",
        desc: "Specialist code reviewer: Automatically assigned by the ML engine based on commit expertise and workload balance. Can approve stages or request changes.",
      }
    : {
        label: "Developer",
        badgeClass: "bg-[rgba(56,139,253,0.15)] text-[#58a6ff] border-[rgba(56,139,253,0.4)]",
        desc: "Core software engineer: Works in invited repositories, creates feature branches, edits code, makes commits, and opens Pull Requests.",
      };

  return (
    <div className="bg-[#0d1117] min-h-screen text-[#e6edf3]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* ── LEFT COLUMN: User Profile Card ── */}
          <aside className="space-y-4">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              {/* Large Avatar */}
              <div className="w-48 h-48 rounded-full bg-[#161b22] border-2 border-[#30363d] flex items-center justify-center font-bold text-6xl text-[#58a6ff] shadow-xl mb-4">
                {(profile?.fullName || profile?.username || "U")[0].toUpperCase()}
              </div>

              {/* Names & Username */}
              <h1 className="text-2xl font-bold text-[#e6edf3] leading-tight">
                {profile?.fullName || profile?.username}
              </h1>
              <span className="text-base font-light text-[#7d8590] block mb-3">
                @{profile?.username}
              </span>

              {/* Role Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold font-mono border uppercase tracking-wider mb-4 ${roleMeta.badgeClass}`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{roleMeta.label}</span>
              </div>

              {/* Role Scope Description */}
              <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d] text-xs text-[#7d8590] leading-relaxed mb-4 text-left">
                {roleMeta.desc}
              </div>

              {/* Metadata List */}
              <div className="w-full space-y-2 text-xs text-[#7d8590] pt-2 border-t border-[#30363d]">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#7d8590] shrink-0" />
                  <span className="truncate text-[#e6edf3]">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
                  <span>Account Verified</span>
                </div>
                {profile?.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#7d8590] shrink-0" />
                    <span>
                      Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
                {typeof profile?.currentOpenReviews === "number" && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#e3b341] shrink-0" />
                    <span>
                      Active Reviews: <strong className="text-[#e6edf3]">{profile.currentOpenReviews}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Expertise Tags (if reviewer) */}
              {profile?.expertiseTags?.length > 0 && (
                <div className="w-full pt-4 border-t border-[#30363d] space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#7d8590] uppercase tracking-wider block">
                    Domain Expertise
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.expertiseTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full text-[11px] font-mono border border-[#30363d] bg-[#161b22] text-[#58a6ff]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── RIGHT COLUMN: Main Tabs & Information ── */}
          <main className="md:col-span-3 space-y-6">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#30363d] pb-2 text-xs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === "overview"
                    ? "bg-[#21262d] text-white"
                    : "text-[#7d8590] hover:text-[#e6edf3]"
                }`}
              >
                <Layers className="w-4 h-4" />
                Overview & Permissions
              </button>
              <button
                onClick={() => setActiveTab("repos")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === "repos"
                    ? "bg-[#21262d] text-white"
                    : "text-[#7d8590] hover:text-[#e6edf3]"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Repositories ({repos.length})
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === "security"
                    ? "bg-[#21262d] text-white"
                    : "text-[#7d8590] hover:text-[#e6edf3]"
                }`}
              >
                <Key className="w-4 h-4" />
                Security & Password
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Role Permissions Box */}
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 space-y-4">
                  <h3 className="font-semibold text-sm text-[#e6edf3] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#58a6ff]" />
                    Role Privileges on Waypoint Platform
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                      <span className="font-semibold text-[#58a6ff] block mb-1">Repositories</span>
                      <p className="text-[#7d8590]">
                        {isTeamLead
                          ? "Can create new projects and manage member invitations."
                          : "Access restricted to projects where an invite was accepted."}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                      <span className="font-semibold text-[#58a6ff] block mb-1">Code & PRs</span>
                      <p className="text-[#7d8590]">
                        Can create feature branches, commit code snapshots, and open Pull Requests.
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-[#161b22] border border-[#30363d]">
                      <span className="font-semibold text-[#58a6ff] block mb-1">Review & Sign-Off</span>
                      <p className="text-[#7d8590]">
                        {isTeamLead
                          ? "Master reviewer access: Can approve or override any stage."
                          : isReviewer
                          ? "Assigned to code review stages by the ML engine."
                          : "Subject to reviewer approval before merging."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ML Reviewer Specialization Tags */}
                <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-sm text-[#e6edf3] flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[#58a6ff]" />
                        ML Reviewer Specialization & Domain Tags
                      </h3>
                      <p className="text-xs text-[#7d8590] mt-1">
                        These tags are indexed by Waypoint&rsquo;s Layer 2 TF-IDF ML ranker to automatically route matching Pull Request review stages to you.
                      </p>
                    </div>
                    {savingTags && (
                      <span className="text-xs text-[#58a6ff] font-mono shrink-0">Saving...</span>
                    )}
                  </div>

                  {tagSuccess && (
                    <div className="p-2.5 rounded bg-[rgba(46,160,67,0.15)] border border-[rgba(46,160,67,0.4)] text-[#3fb950] text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{tagSuccess}</span>
                    </div>
                  )}

                  {tagError && (
                    <div className="p-2.5 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{tagError}</span>
                    </div>
                  )}

                  {/* Active Tags */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tags.length === 0 ? (
                      <span className="text-xs text-[#7d8590] italic">
                        No specialization tags set yet. Add tags below so the ML engine knows your technical domains.
                      </span>
                    ) : (
                      tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-[#161b22] border border-[#30363d] text-[#58a6ff]"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            className="hover:text-[#f85149] text-[#7d8590] transition-colors ml-0.5"
                            title="Remove tag"
                          >
                            &times;
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add Tag Input */}
                  <div className="pt-2 flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="text"
                        placeholder="Add tag (e.g. auth, mongodb, docker)..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="w-full h-8 px-3 text-xs bg-[#161b22] border border-[#30363d] rounded-md text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAddTag()}
                      disabled={!newTagInput.trim() || savingTags}
                    >
                      Add Tag
                    </Button>
                  </div>

                  {/* Suggested quick pills */}
                  <div className="pt-2 border-t border-[#21262d]">
                    <span className="text-[11px] text-[#7d8590] font-medium block mb-1.5">
                      Quick-add common domains:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["auth", "security", "jwt", "database", "mongodb", "models", "infra", "docker", "kubernetes", "frontend", "react", "api"].map((rec) => {
                        const isAdded = tags.includes(rec);
                        return (
                          <button
                            key={rec}
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddTag(rec)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                              isAdded
                                ? "bg-[#21262d] text-[#7d8590] border-transparent cursor-default opacity-50"
                                : "bg-[#161b22] text-[#c9d1d9] border-[#30363d] hover:border-[#58a6ff] hover:text-[#58a6ff]"
                            }`}
                          >
                            +{rec}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Commit History (for ML Reviewers) */}
                {profile?.commitHistory?.length > 0 && (
                  <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-5 space-y-3">
                    <h3 className="font-semibold text-sm text-[#e6edf3] flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-[#e3b341]" />
                      Expertise History (Evaluated by ML Matcher)
                    </h3>
                    <p className="text-xs text-[#7d8590]">
                      The Layer 2 ML engine parses these past commits to compute TF-IDF cosine similarity against incoming Pull Request diffs.
                    </p>
                    <div className="divide-y divide-[#21262d] text-xs pt-1">
                      {profile.commitHistory.map((c, i) => (
                        <div key={i} className="py-2.5 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <span className="font-mono text-[#e6edf3] font-semibold">{c.message}</span>
                            <div className="text-[11px] text-[#7d8590] font-mono">
                              Files: {(c.files || []).join(", ")}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-0.5 rounded">
                            Indexed
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: REPOSITORIES */}
            {activeTab === "repos" && (
              <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
                <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590] font-semibold">
                  <span>Your Repositories & Collaborations</span>
                  <span>{repos.length} Total</span>
                </div>
                <div className="divide-y divide-[#21262d]">
                  {repos.length === 0 ? (
                    <div className="p-8 text-center text-[#7d8590]">
                      No repositories available yet.
                    </div>
                  ) : (
                    repos.map((r) => (
                      <div
                        key={r._id}
                        className="p-4 flex items-center justify-between hover:bg-[#161b22]/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <Link
                            to={`/repos/${r._id}`}
                            className="font-semibold text-sm text-[#58a6ff] hover:underline flex items-center gap-2"
                          >
                            <BookOpen className="w-4 h-4 text-[#7d8590]" />
                            {r.name}
                          </Link>
                          <p className="text-[#7d8590] text-xs max-w-lg truncate">
                            {r.description || "No description provided."}
                          </p>
                          <div className="text-[11px] text-[#7d8590] flex items-center gap-3">
                            <span>Owner: @{r.ownerId?.username || "team_lead"}</span>
                            <span>•</span>
                            <span>{r.members?.length || 1} members</span>
                          </div>
                        </div>

                        <Link to={`/repos/${r._id}`}>
                          <Button size="sm" variant="secondary" icon={ArrowRight}>
                            View Code
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SECURITY & PASSWORD */}
            {activeTab === "security" && (
              <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-6 text-xs max-w-lg space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-[#e6edf3]">Change Password</h3>
                  <p className="text-[#7d8590] text-xs mt-0.5">
                    Ensure your account is using a long, random password to stay secure.
                  </p>
                </div>

                {passwordError && (
                  <div className="p-3 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded bg-[rgba(46,160,67,0.15)] border border-[rgba(46,160,67,0.4)] text-[#3fb950] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                  <div>
                    <label className="block font-semibold text-[#e6edf3] mb-1">Old Password</label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-8 pl-3 pr-9 rounded-md bg-[#161b22] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7d8590] hover:text-[#e6edf3] transition-colors focus:outline-none"
                        title={showOldPassword ? "Hide password" : "Show password"}
                      >
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#e6edf3] mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-8 pl-3 pr-9 rounded-md bg-[#161b22] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7d8590] hover:text-[#e6edf3] transition-colors focus:outline-none"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#e6edf3] mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-8 pl-3 pr-9 rounded-md bg-[#161b22] border border-[#30363d] text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#7d8590] hover:text-[#e6edf3] transition-colors focus:outline-none"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" variant="primary" loading={passwordLoading}>
                    Update password
                  </Button>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
