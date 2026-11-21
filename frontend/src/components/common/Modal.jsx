import React, { useEffect } from "react";
import { X } from "lucide-react";

export const Modal = ({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-xl" }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog (GitHub Primer style) */}
      <div
        className={`relative w-full ${maxWidth} bg-[#161b22] rounded-md shadow-2xl border border-[#30363d] z-10 transition-all text-[#e6edf3]`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22] rounded-t-md">
          <div>
            <h3 className="text-sm font-semibold text-[#e6edf3] leading-none">{title}</h3>
            {subtitle && <p className="text-xs text-[#7d8590] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
