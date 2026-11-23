import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { joinPRRoom, getSocket } from "../services/socket";
import { Button } from "../components/common/Button";
import { Badge } from "../components/common/Badge";
import { PrecheckCard } from "../components/pr/PrecheckCard";
import { DAGStagePipeline } from "../components/pr/DAGStagePipeline";
import { DiffViewer } from "../components/pr/DiffViewer";
import { StageReviewModal } from "../components/pr/StageReviewModal";
import { RepoHeader } from "../components/common/RepoHeader";
import {
  GitPullRequest,
  GitMerge,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  FileCode,
  ShieldCheck,
  UserCheck,
  Settings,
  MoreHorizontal,
  Zap,
  Tag,
  Users,
} from "lucide-react";

export const PRDetailPage = () => {
  const { prId } = useParams();
  const { user } = useAuth();

  const [pr, setPR] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("conversation"); // "conversation" | "checks" | "files"

  // Modals & Actions
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [reviewAction, setReviewAction] = useState("COMPLETED");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [merging, setMerging] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadData = async () => {
    try {
      const [prRes, stageRes] = await Promise.all([
        api.get(`/pullrequests/${prId}`),
        api.get(`/stages/pr/${prId}`).catch(() => ({ data: { data: [] } })),
      ]);
      setPR(prRes.data.data);
      setStages(stageRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    joinPRRoom(prId);

    const socket = getSocket();

    const onStageUpdated = () => loadData();
    const onStagesCreated = () => loadData();
    const onStagesUnblocked = () => loadData();
    const onReviewersAssigned = () => loadData();
    const onPrecheckResult = () => loadData();
    const onPRApproved = () => loadData();
    const onPRMerged = () => loadData();
    const onSLABreached = () => loadData();
    const onStageReassigned = () => loadData();
    const onPRStatusChanged = () => loadData();
    const onStageRejected = () => loadData();

    socket.on("stage_updated", onStageUpdated);
    socket.on("stages_created", onStagesCreated);
    socket.on("stages_unblocked", onStagesUnblocked);
    socket.on("reviewers_assigned", onReviewersAssigned);
    socket.on("precheck_result", onPrecheckResult);
    socket.on("pr_approved", onPRApproved);
    socket.on("pr_merged", onPRMerged);
    socket.on("sla_breached", onSLABreached);
    socket.on("stage_reassigned", onStageReassigned);
    socket.on("pr_status_changed", onPRStatusChanged);
    socket.on("stage_rejected", onStageRejected);

    return () => {
      socket.off("stage_updated", onStageUpdated);
      socket.off("stages_created", onStagesCreated);
      socket.off("stages_unblocked", onStagesUnblocked);
      socket.off("reviewers_assigned", onReviewersAssigned);
      socket.off("precheck_result", onPrecheckResult);
      socket.off("pr_approved", onPRApproved);
      socket.off("pr_merged", onPRMerged);
      socket.off("sla_breached", onSLABreached);
      socket.off("stage_reassigned", onStageReassigned);
      socket.off("pr_status_changed", onPRStatusChanged);
      socket.off("stage_rejected", onStageRejected);
    };
  }, [prId]);

  const handleReviewStage = (stage, action) => {
    setSelectedStage(stage);
    setReviewAction(action);
    setReviewModalOpen(true);
  };

  const submitReview = async ({ stageId, status, reviewComments }) => {
    setSubmittingReview(true);
    setActionError("");
    try {
      await api.patch(`/stages/${stageId}/status`, { status, reviewComments });
      setReviewModalOpen(false);
      setActionSuccess(`Review submitted as ${status}`);
      loadData();
    } catch (err) {
      setActionError(err.message || "Failed to update review status");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleMerge = () => {
    setShowMergeConfirm(true);
    setShowCloseConfirm(false);
  };

  const handleConfirmMerge = async () => {
    const targetBranchName = pr?.toBranch?.name || "base branch";
    setMerging(true);
    setActionError("");
    try {
      await api.post(`/pullrequests/${prId}/merge`);
      setShowMergeConfirm(false);
      setActionSuccess(`Pull request successfully merged into ${targetBranchName}!`);
      loadData();
    } catch (err) {
      setActionError(err.message || "Merge failed. All review stages must be approved first.");
    } finally {
      setMerging(false);
    }
  };

  const handleClosePR = () => {
    setShowCloseConfirm(true);
    setShowMergeConfirm(false);
  };

  const handleConfirmClosePR = async () => {
    setClosing(true);
    setActionError("");
    try {
      await api.post(`/pullrequests/${prId}/close`);
      setShowCloseConfirm(false);
      setActionSuccess("Pull request closed successfully.");
      loadData();
    } catch (err) {
      setActionError(err.message || "Failed to close pull request");
    } finally {
      setClosing(false);
    }
  };

  const handleDemoExpireSLA = async (stageId) => {
    setActionError("");
    try {
      await api.post(`/stages/${stageId}/demo-expire-sla`);
      setActionSuccess("⚡ Demo: Stage SLA expired. Engine evaluated escalation rules!");
      loadData();
    } catch (err) {
      setActionError(err.message || "Could not trigger demo SLA expiry");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-[#7d8590] text-xs font-mono">
        Loading pull request...
      </div>
    );
  }

  const isApproved = pr?.status === "APPROVED";
  const isMerged = pr?.status === "MERGED";
  const isClosed = pr?.status === "CLOSED";
  const isOpen = !isMerged && !isClosed;
  const repo = pr?.repoId;
  const authorName = pr?.authorId?.username || pr?.authorId?.fullName || "author";
  const targetBranchName = pr?.toBranch?.name || "base branch";
  const currentUserId = user?._id || user?.id;
  const authorId = pr?.authorId?._id || pr?.authorId?.id || pr?.authorId;
  const isAuthor =
    (currentUserId && authorId && currentUserId.toString() === authorId.toString()) ||
    pr?.authorId?.username === user?.username;
  const isLeadOrOwner = user?.role === "team_lead" || user?.role === "owner";
  const canClose = isOpen && (isAuthor || isLeadOrOwner);

  return (
    <div className="bg-[#0d1117] min-h-screen text-[#e6edf3]">
      {/* 1. GitHub Repo Subheader Breadcrumbs */}
      <RepoHeader repo={typeof repo === "object" ? repo : { _id: repo, name: "repository" }} prCount={1} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* 2. GitHub PR Title & Number Header */}
        <div className="space-y-2 pb-3 border-b border-[#30363d]">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-normal text-[#e6edf3] tracking-tight leading-snug">
              {pr?.title}{" "}
              <span className="text-[#7d8590] font-light">#{pr?.prNumber ? pr.prNumber : prId?.slice(-4)}</span>
            </h1>

            <div className="flex items-center gap-2 shrink-0">
              <Link to={`/repos/${repo?._id || repo}`}>
                <Button size="sm" variant="secondary">
                  Back to repository
                </Button>
              </Link>
            </div>
          </div>

          {/* GitHub PR Status Line (Open/Merged pill + Branch summary) */}
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-[#7d8590]">
            {isMerged ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#8957e5]">
                <GitMerge className="w-3.5 h-3.5" />
                Merged
              </span>
            ) : isOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#238636]">
                <GitPullRequest className="w-3.5 h-3.5" />
                Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white bg-[#da3633]">
                Closed
              </span>
            )}

            <span>
              <strong className="text-[#e6edf3] font-semibold">{authorName}</strong> wants to merge into{" "}
              <span className="branch-pill">{pr?.toBranch?.name || "develop"}</span> from{" "}
              <span className="branch-pill">{pr?.fromBranch?.name}</span>
            </span>
            <span>•</span>
            <span>Created {new Date(pr?.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Feedback alerts */}
        {actionError && (
          <div className="p-3 rounded-md bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 rounded-md bg-[rgba(46,160,67,0.15)] border border-[rgba(46,160,67,0.4)] text-[#3fb950] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* 3. GitHub PR Tabs Bar */}
        <div className="flex items-center gap-1 border-b border-[#30363d] -mb-1">
          <button
            onClick={() => setActiveTab("conversation")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "conversation"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#7d8590] hover:text-[#e6edf3]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Conversation</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#30363d] text-[#c9d1d9]">1</span>
          </button>

          <button
            onClick={() => setActiveTab("checks")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "checks"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#7d8590] hover:text-[#e6edf3]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Checks & DAG</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#30363d] text-[#c9d1d9]">
              {stages.length + 1}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "files"
                ? "border-[#f78166] text-[#e6edf3] font-semibold"
                : "border-transparent text-[#7d8590] hover:text-[#e6edf3]"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Files changed</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#30363d] text-[#c9d1d9]">
              {pr?.changedPaths?.length || 1}
            </span>
          </button>
        </div>

        {/* 4. Two-Column Layout (75% / 25%) */}
        {activeTab === "conversation" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-3">
            {/* Left 3/4 Column: Conversation & Merge Box */}
            <div className="lg:col-span-3 space-y-6">
              {/* Author PR Comment Box */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-xs text-[#58a6ff] shrink-0">
                  {authorName[0]?.toUpperCase()}
                </div>

                <div className="flex-1 border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
                  <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#7d8590]">
                    <div>
                      <strong className="text-[#e6edf3] font-semibold">{authorName}</strong> commented on{" "}
                      {new Date(pr?.createdAt).toLocaleDateString()}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] border border-[#30363d] font-semibold text-[#7d8590]">
                      Author
                    </span>
                  </div>
                  <div className="p-4 text-xs text-[#c9d1d9] leading-relaxed">
                    {pr?.description || "No description provided."}
                  </div>
                </div>
              </div>

              {/* Timeline event: Commit snapshot */}
              <div className="flex items-center gap-3 pl-4 text-xs text-[#7d8590]">
                <GitCommit className="w-4 h-4 text-[#7d8590]" />
                <span>
                  <strong className="text-[#e6edf3] font-semibold">{authorName}</strong> committed changes into{" "}
                  <code className="text-[#58a6ff]">{pr?.fromBranch?.name}</code>
                </span>
              </div>

              {/* Layer 3 Pre-Check Summary Card */}
              {pr?.precheckResult && (
                <div className="pl-4">
                  <PrecheckCard precheck={pr.precheckResult} />
                </div>
              )}

              {/* ── GITHUB MERGE & CHECKS BOX ── */}
              <div className="pl-4 space-y-4">
                <DAGStagePipeline
                  stages={stages}
                  onReviewStage={handleReviewStage}
                  onDemoExpireSLA={handleDemoExpireSLA}
                  currentUserId={currentUserId}
                  currentUser={user}
                  isAuthor={isAuthor}
                  userRole={user?.role}
                  repoOwnerId={repo?.ownerId?._id || repo?.ownerId?.id || repo?.ownerId}
                  repoMembers={repo?.members || []}
                  onReload={loadData}
                />

                {/* Classic GitHub Merge & Close Box */}
                <div className="border border-[#30363d] rounded-md bg-[#161b22] p-4 text-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isClosed ? (
                        <XCircle className="w-6 h-6 text-[#da3633]" />
                      ) : isMerged ? (
                        <CheckCircle2 className="w-6 h-6 text-[#8957e5]" />
                      ) : isApproved ? (
                        <CheckCircle2 className="w-6 h-6 text-[#3fb950]" />
                      ) : (
                        <Clock className="w-6 h-6 text-[#d29922]" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#e6edf3]">
                        {isClosed
                          ? "This pull request is closed"
                          : isMerged
                          ? "Pull request successfully merged and closed"
                          : isApproved
                          ? "This branch has no conflicts with the base branch"
                          : "Merging is blocked until review requirements are met"}
                      </h4>
                      <p className="text-[#7d8590] mt-0.5">
                        {isClosed
                          ? `Closed without merging. No changes were applied to ${targetBranchName}.`
                          : isMerged
                          ? `Merged by ${pr?.authorId?.username || "developer"} into ${targetBranchName}.`
                          : isApproved
                          ? "All DAG stage sign-offs and automated pre-checks are complete. Merging can be performed."
                          : `All review stages in the DAG must reach COMPLETED status before merging into ${targetBranchName}.`}
                      </p>
                    </div>
                  </div>

                  {isOpen && (
                    <>
                      {showMergeConfirm ? (
                        <div className="pt-3 border-t border-[#30363d] space-y-3 bg-[#0d1117] p-3.5 rounded-md border border-[#238636]/40">
                          <div className="flex items-start gap-2.5">
                            <GitMerge className="w-5 h-5 text-[#3fb950] shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h5 className="font-semibold text-xs text-[#e6edf3]">
                                Confirm merge into &lsquo;{targetBranchName}&rsquo;
                              </h5>
                              <p className="text-[12px] text-[#7d8590]">
                                Confirm merge into &lsquo;{targetBranchName}&rsquo;? This will apply file changes and close the pull request.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              loading={merging}
                              icon={GitMerge}
                              onClick={handleConfirmMerge}
                            >
                              Confirm merge
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={merging}
                              onClick={() => setShowMergeConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : showCloseConfirm ? (
                        <div className="pt-3 border-t border-[#30363d] space-y-3 bg-[#0d1117] p-3.5 rounded-md border border-[#f85149]/40">
                          <div className="flex items-start gap-2.5">
                            <XCircle className="w-5 h-5 text-[#f85149] shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h5 className="font-semibold text-xs text-[#e6edf3]">
                                Close pull request without merging?
                              </h5>
                              <p className="text-[12px] text-[#7d8590]">
                                Confirm close this pull request without merging? This will cancel pending reviews and release assigned reviewers.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={closing}
                              icon={XCircle}
                              onClick={handleConfirmClosePR}
                              className="text-[#f85149] hover:bg-[rgba(248,81,73,0.15)] border-[#da3633]"
                            >
                              Confirm close
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={closing}
                              onClick={() => setShowCloseConfirm(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-[#30363d] flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-3">
                            <Button
                              variant={isApproved ? "primary" : "secondary"}
                              disabled={!isApproved}
                              loading={merging}
                              icon={GitMerge}
                              onClick={handleMerge}
                            >
                              {isApproved ? "Merge pull request" : "Merging is blocked"}
                            </Button>
                            {!isApproved && (
                              <span className="text-[11px] text-[#7d8590]">
                                DAG stages are currently in progress or waiting on dependencies.
                              </span>
                            )}
                          </div>

                          {canClose && (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={closing}
                              onClick={handleClosePR}
                              className="text-[#f85149] hover:bg-[rgba(248,81,73,0.1)] border-[#30363d]"
                            >
                              Close pull request
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right 1/4 Column: Classic GitHub PR Sidebar */}
            <div className="space-y-4 text-xs divide-y divide-[#30363d]">
              {/* Reviewers section */}
              <div className="space-y-2 pb-4">
                <div className="flex items-center justify-between text-[#7d8590] font-semibold text-xs">
                  <span>Reviewers</span>
                  <span className="text-[10px] text-[#58a6ff] font-mono">ML Match</span>
                </div>
                <div className="space-y-1.5">
                  {stages.flatMap((s) => s.assignedReviewers || []).length === 0 ? (
                    <span className="text-[#7d8590] italic">No reviewers assigned yet</span>
                  ) : (
                    stages.map((stage) => {
                      const isComplete = stage.status === "COMPLETED";
                      const isRejected = stage.status === "REJECTED";
                      return (
                        <div key={stage._id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-1.5">
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950]" />
                            ) : isRejected ? (
                              <XCircle className="w-3.5 h-3.5 text-[#f85149]" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-[#d29922]" />
                            )}
                            <span className="text-[#c9d1d9] font-medium">
                              {stage.assignedReviewers?.map((r) => r.fullName || r.username).join(", ") || "Unassigned"}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#7d8590]">
                            {stage.stageType.replace("_REVIEW", "")}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Assignees section */}
              <div className="space-y-2 pt-4 pb-4">
                <span className="text-[#7d8590] font-semibold text-xs block">Assignees</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center font-bold text-[10px] text-[#58a6ff]">
                    {authorName[0]?.toUpperCase()}
                  </div>
                  <span className="text-[#c9d1d9] font-medium">{authorName}</span>
                </div>
              </div>

              {/* Labels section */}
              <div className="space-y-2 pt-4 pb-4">
                <span className="text-[#7d8590] font-semibold text-xs block">Labels</span>
                <div className="flex flex-wrap gap-1">
                  {(pr?.stageTypes || []).map((type, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-[#30363d] bg-[#21262d] text-[#c9d1d9]"
                    >
                      stage: {type.toLowerCase().replace("_review", "")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Development branches section */}
              <div className="space-y-2 pt-4">
                <span className="text-[#7d8590] font-semibold text-xs block">Development</span>
                <div className="text-[11px] text-[#7d8590] space-y-1">
                  <div>
                    Source: <code className="text-[#58a6ff]">{pr?.fromBranch?.name}</code>
                  </div>
                  <div>
                    Target: <code className="text-[#58a6ff]">{pr?.toBranch?.name}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Checks & DAG Tab */}
        {activeTab === "checks" && (
          <div className="space-y-6 pt-3">
            <PrecheckCard precheck={pr?.precheckResult} />
            <DAGStagePipeline
              stages={stages}
              onReviewStage={handleReviewStage}
              onDemoExpireSLA={handleDemoExpireSLA}
              currentUserId={user?._id}
            />
          </div>
        )}

        {/* Files Changed (Diff) Tab */}
        {activeTab === "files" && (
          <div className="pt-3">
            <DiffViewer diffText={pr?.diff} />
          </div>
        )}
      </div>

      {/* Review Modal */}
      <StageReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        stage={selectedStage}
        actionType={reviewAction}
        onSubmit={submitReview}
        loading={submittingReview}
      />
    </div>
  );
};
