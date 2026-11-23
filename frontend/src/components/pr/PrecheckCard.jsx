import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Sparkles, Terminal } from "lucide-react";

export const PrecheckCard = ({ precheck }) => {
  if (!precheck) {
    return (
      <div className="border border-[#30363d] rounded-md bg-[#0d1117] p-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#d29922] animate-pulse" />
          <span className="font-semibold text-[#e6edf3]">Layer 3: Pre-check running</span>
          <span className="text-[#7d8590]">LangGraph static analysis in progress...</span>
        </div>
      </div>
    );
  }

  const { status, summary, issues = [] } = precheck;
  const isPassed = status === "PASSED" || (status === "ISSUES_FOUND" && !issues.some((i) => i.severity === "BLOCKING"));

  return (
    <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
      {/* GitHub Check Header */}
      <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPassed ? (
            <CheckCircle2 className="w-4 h-4 text-[#3fb950]" />
          ) : (
            <XCircle className="w-4 h-4 text-[#f85149]" />
          )}
          <span className="font-semibold text-sm text-[#e6edf3]">
            Waypoint Automated Pre-Check / LangGraph
          </span>
          <span className="text-[11px] font-mono text-[#7d8590] px-1.5 py-0.2 rounded border border-[#30363d] bg-[#0d1117]">
            Groq Llama-3
          </span>
        </div>

        <span
          className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
            isPassed
              ? "text-[#3fb950] bg-[rgba(46,160,67,0.15)]"
              : "text-[#f85149] bg-[rgba(248,81,73,0.15)]"
          }`}
        >
          {isPassed ? "Successful" : "Action Required"}
        </span>
      </div>

      {/* Summary */}
      <div className="p-4 space-y-3">
        <p className="text-[#c9d1d9] leading-relaxed">
          {summary || (isPassed ? "All automated checks completed without blocking issues." : "Violations identified.")}
        </p>

        {/* Annotations / Findings */}
        {issues.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#21262d]">
            <span className="font-semibold text-[#7d8590] uppercase tracking-wider text-[10px] block">
              Annotations ({issues.length})
            </span>
            <div className="space-y-1.5">
              {issues.map((issue, idx) => {
                const isBlocking = issue.severity === "BLOCKING";
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded border border-[#30363d] bg-[#161b22] flex items-start gap-2.5"
                  >
                    {isBlocking ? (
                      <XCircle className="w-4 h-4 text-[#f85149] mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#d29922] mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#e6edf3]">{issue.type || "Quality check"}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#30363d] text-[#7d8590]">
                          {issue.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-[#c9d1d9] font-sans text-xs">{issue.description || issue.message}</p>
                      {issue.file && (
                        <div className="mt-1 text-[11px] text-[#58a6ff]">
                          {issue.file}:{issue.line || 1}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
