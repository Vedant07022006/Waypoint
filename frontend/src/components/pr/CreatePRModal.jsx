import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { GitPullRequest, ArrowRight, AlertCircle } from "lucide-react";

export const CreatePRModal = ({
  isOpen,
  onClose,
  branches = [],
  currentBranch = null,
  onSubmit,
  loading,
}) => {
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  // Auto-initialize branches whenever the modal opens
  useEffect(() => {
    if (isOpen && branches.length > 0) {
      // 1. Determine default base branch (prefer 'main', then 'develop', then first branch)
      const baseCandidate =
        branches.find((b) => b.name === "main") ||
        branches.find((b) => b.name === "develop") ||
        branches[0];

      const defaultBaseId = baseCandidate?._id || "";
      setToBranchId(defaultBaseId);

      // 2. Determine default compare branch (prefer current active branch if different from base, or first branch that isn't base)
      if (currentBranch && currentBranch._id !== defaultBaseId) {
        setFromBranchId(currentBranch._id);
      } else {
        const compareCandidate = branches.find((b) => b._id !== defaultBaseId);
        setFromBranchId(compareCandidate?._id || "");
      }

      setError("");
    }
  }, [isOpen, branches, currentBranch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fromBranchId) {
      setError("Please select a compare branch (source).");
      return;
    }
    if (!toBranchId) {
      setError("Please select a base branch (target).");
      return;
    }
    if (fromBranchId === toBranchId) {
      setError("Base and compare branches must be different.");
      return;
    }

    if (!title.trim()) {
      setError("PR title is required.");
      return;
    }

    try {
      await onSubmit({
        fromBranchId,
        toBranchId,
        title,
        description,
      });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create pull request";
      setError(msg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Open a pull request"
      subtitle="Compare changes across branches to trigger automated DAG reviews."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-2.5 rounded bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* GitHub Branch Comparison Box */}
        <div className="p-3 rounded-md bg-[#0d1117] border border-[#30363d] flex items-center justify-between gap-3">
          {/* Base branch select (target) */}
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-[#7d8590] mb-1">
              base:
            </label>
            <select
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#58a6ff] font-semibold focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              <option value="">Select base...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} {b.name === "main" ? "(default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 text-[#7d8590] shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Compare branch select (source) */}
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-[#7d8590] mb-1">
              compare:
            </label>
            <select
              value={fromBranchId}
              onChange={(e) => setFromBranchId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-md bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#e6edf3] focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              <option value="">Select branch...</option>
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#e6edf3] mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add title"
            className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <div>
          <label className="block font-semibold text-[#e6edf3] mb-1">
            Description <span className="text-[#7d8590] font-normal">(optional)</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Leave a comment"
            className="w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} icon={GitPullRequest}>
            Create pull request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
