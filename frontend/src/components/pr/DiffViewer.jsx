import React, { useMemo } from "react";
import { FileText, ChevronDown } from "lucide-react";

export const DiffViewer = ({ diffText }) => {
  const parsedDiff = useMemo(() => {
    if (!diffText) return [];
    const lines = diffText.split("\n");
    let currentFile = null;
    const files = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for file header lines
      if (line.startsWith("diff --git") || line.startsWith("Index:")) {
        const match = line.match(/(?:a\/|b\/|Index:\s*)([^\s]+)/);
        const fileName = match ? match[1] : "Modified file";
        currentFile = { name: fileName, hunks: [], additions: 0, deletions: 0 };
        files.push(currentFile);
        continue;
      }

      if (line.startsWith("--- ") || line.startsWith("+++ ")) {
        const match = line.match(/(?:---|\+\+\+)\s+(?:a\/|b\/)?([^\s\t]+)/);
        const extracted = match ? match[1] : "";
        if (extracted && extracted !== "/dev/null") {
          if (!currentFile || currentFile.name === "Modified file" || currentFile.name === "Changes") {
            if (currentFile && (currentFile.name === "Changes" || currentFile.name === "Modified file") && currentFile.hunks.length === 0) {
              currentFile.name = extracted;
            } else if (!currentFile || currentFile.name !== extracted) {
              currentFile = { name: extracted, hunks: [], additions: 0, deletions: 0 };
              files.push(currentFile);
            }
          }
        }
        if (currentFile) {
          currentFile.hunks.push({ line, type: "header" });
        }
        continue;
      }

      // Ignore separator/delimiter lines when no file is active
      if (!currentFile) {
        if (line.startsWith("===") || !line.trim()) {
          continue;
        }
        currentFile = { name: "Changes", hunks: [], additions: 0, deletions: 0 };
        files.push(currentFile);
      }

      let type = "context";
      if (line.startsWith("+") && !line.startsWith("+++")) {
        type = "addition";
        currentFile.additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        type = "deletion";
        currentFile.deletions++;
      } else if (line.startsWith("@@")) {
        type = "hunk";
      }

      currentFile.hunks.push({ line, type });
    }

    return files.filter((f) => f.hunks.length > 0);
  }, [diffText]);

  if (!diffText || diffText.trim().length === 0) {
    return (
      <div className="border border-[#30363d] rounded-md p-8 text-center text-[#7d8590] text-xs font-mono bg-[#0d1117]">
        There are no changes to show.
      </div>
    );
  }

  const totalAdditions = parsedDiff.reduce((acc, f) => acc + f.additions, 0);
  const totalDeletions = parsedDiff.reduce((acc, f) => acc + f.deletions, 0);

  return (
    <div className="space-y-4">
      {/* Diff Stats Banner */}
      <div className="flex items-center justify-between text-xs text-[#7d8590] pb-2 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#e6edf3]">Showing {parsedDiff.length} changed files</span>
          <span>with</span>
          <span className="text-[#3fb950] font-mono font-semibold">+{totalAdditions}</span>
          <span>additions and</span>
          <span className="text-[#f85149] font-mono font-semibold">-{totalDeletions}</span>
          <span>deletions.</span>
        </div>
      </div>

      {parsedDiff.map((file, fileIdx) => (
        <div key={fileIdx} className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
          {/* GitHub File Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-[#30363d]">
            <div className="flex items-center gap-2">
              <ChevronDown className="w-3.5 h-3.5 text-[#7d8590]" />
              <FileText className="w-3.5 h-3.5 text-[#7d8590]" />
              <span className="font-mono text-xs font-semibold text-[#58a6ff]">
                {file.name}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#3fb950]">+{file.additions}</span>
              <span className="text-[#f85149]">-{file.deletions}</span>
            </div>
          </div>

          {/* GitHub Diff Lines */}
          <div className="overflow-x-auto font-mono text-[11px] leading-5">
            {file.hunks.map((item, idx) => {
              const isAdd = item.type === "addition";
              const isDel = item.type === "deletion";
              const isHunk = item.type === "hunk";

              return (
                <div
                  key={idx}
                  className={`flex items-start select-text ${
                    isAdd
                      ? "diff-add-line"
                      : isDel
                      ? "diff-del-line"
                      : isHunk
                      ? "diff-hunk"
                      : "hover:bg-[#161b22] text-[#c9d1d9]"
                  }`}
                >
                  <span className="w-10 select-none text-[#6e7681] text-right pr-2 text-[10px] shrink-0 border-r border-[#30363d]/30">
                    {idx + 1}
                  </span>
                  <pre className="px-3 flex-1 whitespace-pre-wrap break-all font-mono">
                    {item.line}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
