import React from "react";
import { GitPullRequest, GitMerge, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const STATUS_CONFIGS = {
  // PR Statuses — Exact GitHub style
  PRECHECK_RUNNING: { label: "Precheck running", bg: "bg-[#1f2937]", text: "text-[#7d8590]", border: "border-[#30363d]", icon: Clock },
  PRECHECK_FAILED:  { label: "Precheck failed", bg: "bg-[rgba(248,81,73,0.15)]", text: "text-[#f85149]", border: "border-[rgba(248,81,73,0.4)]", icon: XCircle },
  REVIEW_PENDING:   { label: "Open", bg: "bg-[#238636]", text: "text-white", border: "border-transparent", icon: GitPullRequest },
  OPEN:             { label: "Open", bg: "bg-[#238636]", text: "text-white", border: "border-transparent", icon: GitPullRequest },
  APPROVED:         { label: "Approved", bg: "bg-[#238636]", text: "text-white", border: "border-transparent", icon: CheckCircle2 },
  MERGED:           { label: "Merged", bg: "bg-[#8957e5]", text: "text-white", border: "border-transparent", icon: GitMerge },
  CLOSED:           { label: "Closed", bg: "bg-[#da3633]", text: "text-white", border: "border-transparent", icon: AlertCircle },

  // Stage Statuses
  PENDING:          { label: "Pending", bg: "bg-[#21262d]", text: "text-[#7d8590]", border: "border-[#30363d]" },
  IN_PROGRESS:      { label: "In review", bg: "bg-[rgba(187,128,9,0.15)]", text: "text-[#d29922]", border: "border-[rgba(187,128,9,0.4)]" },
  COMPLETED:        { label: "Approved", bg: "bg-[rgba(46,160,67,0.15)]", text: "text-[#3fb950]", border: "border-[rgba(46,160,67,0.4)]" },
  BLOCKED:          { label: "Blocked", bg: "bg-[#21262d]", text: "text-[#7d8590]", border: "border-[#30363d]" },
  REJECTED:         { label: "Changes requested", bg: "bg-[rgba(248,81,73,0.15)]", text: "text-[#f85149]", border: "border-[rgba(248,81,73,0.4)]" },

  // Roles
  DEVELOPER:        { label: "Developer", bg: "bg-[#21262d]", text: "text-[#7d8590]", border: "border-[#30363d]" },
  REVIEWER:         { label: "Reviewer", bg: "bg-[#21262d]", text: "text-[#7d8590]", border: "border-[#30363d]" },
  TEAM_LEAD:        { label: "Team Lead", bg: "bg-[rgba(56,139,253,0.15)]", text: "text-[#58a6ff]", border: "border-[rgba(56,139,253,0.4)]" },
  ADMIN:            { label: "Admin", bg: "bg-[rgba(163,113,247,0.15)]", text: "text-[#a371f7]", border: "border-[rgba(163,113,247,0.4)]" },
};

export const Badge = ({ status, text, pulse = false, className = "" }) => {
  const config = STATUS_CONFIGS[status] || {
    label: text || status,
    bg: "bg-[#21262d]",
    text: "text-[#c9d1d9]",
    border: "border-[#30363d]",
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {text || config.label}
    </span>
  );
};
