import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { Button } from "../common/Button";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  UserCheck,
  Zap,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const STAGE_NAMES = {
  AUTH_REVIEW: "Auth & Identity Security Review",
  DB_REVIEW: "Database & Schema Performance Review",
  INFRA_REVIEW: "Infrastructure & Dockerfile Review",
  SECURITY_SIGNOFF: "Final Security Sign-Off Gate",
  GENERAL_REVIEW: "General Code Quality Review",
};

const formatTimeRemaining = (deadline) => {
  if (!deadline) return null;
  const total = new Date(deadline).getTime() - Date.now();
  if (total <= 0) return { text: "SLA breached", isBreached: true };

  const hours = Math.floor(total / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  if (hours === 0) {
    return {
      text: `${minutes}m ${seconds}s remaining`,
      isUrgent: true,
      isBreached: false,
    };
  }

  return {
    text: `${hours}h ${minutes}m remaining`,
    isUrgent: hours < 6,
    isBreached: false,
  };
};

export const DAGStagePipeline = ({
  stages = [],
  onReviewStage,
  onDemoExpireSLA,
  currentUserId,
  currentUser = null,
  isAuthor = false,
  userRole = "",
  repoOwnerId = null,
  repoMembers = [],
  onReload,
}) => {
  const [, setTick] = useState(0);
  const [assigningStageId, setAssigningStageId] = useState(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");

  const handleAssignReviewer = async (stageId) => {
    if (!selectedReviewerId) return;
    setAssignLoading(true);
    setAssignError("");
    try {
      await api.patch(`/stages/${stageId}/assign`, {
        reviewerIds: [selectedReviewerId],
      });
      setAssigningStageId(null);
      setSelectedReviewerId("");
      if (onReload) onReload();
    } catch (err) {
      setAssignError(err.message || "Failed to assign reviewer");
    } finally {
      setAssignLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const allApproved = stages.length > 0 && stages.every((s) => s.status === "COMPLETED");
  const hasRejection = stages.some((s) => s.status === "REJECTED");
  const hasBreach = stages.some((s) => s.slaBreached);

  return (
    <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
      {/* GitHub Mergeability Header Bar */}
      <div
        className={`px-4 py-3 border-b border-[#30363d] flex items-start gap-3 ${
          allApproved
            ? "bg-[rgba(46,160,67,0.1)] text-[#3fb950]"
            : hasRejection
            ? "bg-[rgba(248,81,73,0.1)] text-[#f85149]"
            : "bg-[#161b22] text-[#e6edf3]"
        }`}
      >
        <div className="mt-0.5">
          {allApproved ? (
            <CheckCircle2 className="w-5 h-5 text-[#3fb950]" />
          ) : hasRejection ? (
            <XCircle className="w-5 h-5 text-[#f85149]" />
          ) : (
            <Clock className="w-5 h-5 text-[#d29922]" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm leading-tight text-[#e6edf3]">
            {allApproved
              ? "All review stages have passed"
              : hasRejection
              ? "Changes requested on one or more review stages"
              : "Review required"}
          </div>
          <div className="text-[#7d8590] text-xs mt-0.5">
            {allApproved
              ? "DAG topological constraints met. This branch is ready to be merged."
              : "Stages unlock in topological dependency order. Reviewers are assigned by ML expertise matching."}
          </div>
        </div>
      </div>

      {/* GitHub Checks List */}
      <div className="divide-y divide-[#21262d]">
        {stages.map((stage) => {
          const sla = stage.status === "IN_PROGRESS" ? formatTimeRemaining(stage.slaDeadline) : null;
          const isCompleted = stage.status === "COMPLETED";
          const isRejected = stage.status === "REJECTED";
          const isBlocked = stage.status === "BLOCKED";
          const isInProgress = stage.status === "IN_PROGRESS";

          const uid = (currentUserId || currentUser?._id || currentUser?.id)?.toString();
          const uname = currentUser?.username;

          const isAssigned = (stage.assignedReviewers || []).some((r) => {
            const rid = (r?._id || r?.id || r)?.toString();
            const rname = r?.username;
            return (rid && uid && rid === uid) || (rname && uname && rname === uname);
          });

          const normalizedRole = (userRole || currentUser?.role || "").toLowerCase();
          const isTeamLeadOrOwner =
            normalizedRole === "team_lead" ||
            normalizedRole === "owner" ||
            (repoOwnerId && uid && repoOwnerId.toString() === uid);

          const canReview = !isAuthor && (isAssigned || isTeamLeadOrOwner);

          return (
            <div
              key={stage._id}
              className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#161b22]/50 transition-colors"
            >
              {/* Check Status Icon & Details */}
              <div className="flex items-start gap-2.5 flex-1">
                <div className="mt-0.5 shrink-0">
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-[#3fb950]" />}
                  {isRejected && <XCircle className="w-4 h-4 text-[#f85149]" />}
                  {isInProgress && <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#d29922] mt-0.5" />}
                  {isBlocked && <span className="inline-block w-3.5 h-3.5 rounded-full border border-[#7d8590] mt-0.5" />}
                  {stage.status === "PENDING" && <span className="inline-block w-3.5 h-3.5 rounded-full bg-[#7d8590] mt-0.5" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#e6edf3]">
                      {STAGE_NAMES[stage.stageType] || stage.stageType}
                    </span>
                    <span className="font-mono text-[10px] text-[#7d8590] px-1.5 py-0.2 rounded border border-[#30363d] bg-[#161b22]">
                      {stage.stageType}
                    </span>
                    {isBlocked && stage.dependsOn?.length > 0 && (
                      <span className="text-[11px] text-[#7d8590] font-mono">
                        (Blocked: waiting on {stage.dependsOn.join(", ")})
                      </span>
                    )}
                  </div>

                  {/* Reviewers and SLA metadata */}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#7d8590] flex-wrap">
                    {stage.assignedReviewers?.length > 0 ? (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-[#58a6ff]" />
                        <span>
                          Assigned:{" "}
                          <strong className="text-[#c9d1d9]">
                            {stage.assignedReviewers.map((r) => r.fullName || r.username).join(", ")}
                          </strong>
                        </span>
                        <span className="text-[#58a6ff] text-[10px] px-1 rounded bg-[#58a6ff]/10">ML</span>
                        {stage.assignmentMetadata?.scores && Object.keys(stage.assignmentMetadata.scores).length > 0 && (
                          <span
                            className="text-[#3fb950] text-[10px] font-mono px-1 rounded bg-[#3fb950]/10"
                            title="TF-IDF Cosine Similarity & Workload Score"
                          >
                            Score: {(Math.max(...Object.values(stage.assignmentMetadata.scores)) * 100).toFixed(0)}%
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="italic">Awaiting reviewer assignment</span>
                    )}

                    {sla && (
                      <span
                        className={`inline-flex items-center gap-1 font-mono ${
                          sla.isBreached
                            ? "text-[#f85149] font-semibold"
                            : sla.isUrgent
                            ? "text-[#d29922]"
                            : "text-[#7d8590]"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {sla.text}
                      </span>
                    )}

                    {stage.escalationCount > 0 && (
                      <span className="text-[#f85149] font-mono">
                        Escalated {stage.escalationCount}x
                      </span>
                    )}
                  </div>

                  {/* Team Lead Inline Reassignment Form */}
                  {assigningStageId === stage._id && (
                    <div className="mt-2.5 p-2 bg-[#161b22] border border-[#30363d] rounded flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[#7d8590] font-semibold">Assign Reviewer:</span>
                      <select
                        value={selectedReviewerId}
                        onChange={(e) => setSelectedReviewerId(e.target.value)}
                        className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3]"
                      >
                        <option value="">-- Choose Reviewer --</option>
                        {repoMembers
                          .filter((m) => (m._id || m) !== currentUserId)
                          .map((m) => (
                            <option key={m._id || m} value={m._id || m}>
                              {m.fullName || m.username || m._id || m} ({m.role || "member"})
                            </option>
                          ))}
                      </select>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={assignLoading}
                        onClick={() => handleAssignReviewer(stage._id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAssigningStageId(null)}
                      >
                        Cancel
                      </Button>
                      {assignError && <span className="text-[#f85149] text-xs">{assignError}</span>}
                    </div>
                  )}

                  {/* Review comments */}
                  {stage.reviewComments && (
                    <div
                      className={`mt-2 p-2.5 rounded-md border text-xs flex items-start gap-2 ${
                        isRejected
                          ? "bg-[rgba(248,81,73,0.12)] border-[rgba(248,81,73,0.4)] text-[#f85149]"
                          : "bg-[#161b22] border-[#30363d] text-[#c9d1d9]"
                      }`}
                    >
                      {isRejected && <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#f85149]" />}
                      <div>
                        {isRejected && (
                          <span className="font-semibold block text-[11px] uppercase tracking-wider mb-0.5 text-[#f85149]">
                            Reviewer Requested Changes:
                          </span>
                        )}
                        &ldquo;{stage.reviewComments}&rdquo;
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons (Approve / Reject / Team Lead Reassign / Fast-forward SLA demo) */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {canReview && (isInProgress || stage.status === "PENDING" || stage.status === "REJECTED") && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => onReviewStage(stage, "COMPLETED")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onReviewStage(stage, "REJECTED")}
                    >
                      Request changes
                    </Button>
                  </>
                )}

                {isAuthor && (isInProgress || stage.status === "PENDING" || stage.status === "REJECTED") && (
                  <span className="text-[11px] text-[#7d8590] italic">
                    Author cannot review
                  </span>
                )}

                {isTeamLeadOrOwner && (isInProgress || stage.status === "PENDING" || stage.status === "REJECTED") && (
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningStageId(assigningStageId === stage._id ? null : stage._id);
                      setAssignError("");
                    }}
                    className="px-2 py-1 text-[11px] font-mono rounded border border-[#30363d] bg-[#161b22] text-[#58a6ff] hover:bg-[#21262d]"
                    title="Team Lead: Reassign reviewer manually"
                  >
                    Reassign
                  </button>
                )}

                {isInProgress && onDemoExpireSLA && (
                  <button
                    type="button"
                    onClick={() => onDemoExpireSLA(stage._id)}
                    className="px-2 py-1 text-[11px] font-mono rounded border border-[#30363d] bg-[#21262d] text-[#e3b341] hover:bg-[#30363d]"
                    title="Demo trigger: Expire SLA deadline to test auto-escalation"
                  >
                    <Zap className="w-3 h-3 inline mr-1" />
                    Expire SLA
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
