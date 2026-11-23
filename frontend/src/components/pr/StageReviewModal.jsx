import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { CheckCircle2, XCircle } from "lucide-react";

export const StageReviewModal = ({ isOpen, onClose, stage, actionType, onSubmit, loading }) => {
  const [comments, setComments] = useState("");

  if (!stage) return null;

  const isApprove = actionType === "COMPLETED";

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      stageId: stage._id,
      status: actionType,
      reviewComments: comments,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApprove ? "Submit review: Approve" : "Submit review: Request changes"}
      subtitle={`Stage: ${stage.stageType}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-[#e6edf3] mb-1">
            Review comments <span className="text-[#7d8590] font-normal">{isApprove ? "(optional)" : "(required for rejections)"}</span>
          </label>
          <textarea
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={
              isApprove
                ? "LGTM. All quality and security requirements verified."
                : "Please resolve the following issues before re-submitting for review..."
            }
            className="w-full p-3 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff] resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#30363d]">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant={isApprove ? "primary" : "danger"}
            type="submit"
            loading={loading}
            icon={isApprove ? CheckCircle2 : XCircle}
          >
            {isApprove ? "Submit approval" : "Request changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
