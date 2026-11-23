import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { Button } from "../components/common/Button";
import { RepoHeader } from "../components/common/RepoHeader";
import {
  FileCode,
  GitBranch,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  Upload,
  Plus,
  Trash2,
  FileText,
  FolderPlus,
  FileUp,
} from "lucide-react";

export const CodeExplorerPage = () => {
  const { repoId, branchId } = useParams();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [repo, setRepo] = useState(null);
  const [branch, setBranch] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [newFilePath, setNewFilePath] = useState("");
  
  // Modes: "edit" | "create" | "upload"
  const [mode, setMode] = useState(searchParams.get("action") === "upload" ? "upload" : "edit");

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState([]); // [{ name, path, content, size }]
  const [folderPrefix, setFolderPrefix] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      const [repoRes, branchRes] = await Promise.all([
        api.get(`/repos/${repoId}`),
        api.get(`/repos/${repoId}/branches`),
      ]);
      setRepo(repoRes.data.data);
      const bList = branchRes.data.data || [];
      const current = bList.find((b) => b._id === branchId);
      setBranch(current);

      if (current?.files?.length > 0 && !selectedFile && mode === "edit") {
        setSelectedFile(current.files[0]);
        setFileContent(current.files[0].content || "");
        setCommitMessage(`Update ${current.files[0].path}`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load repository branch files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [repoId, branchId]);

  const handleSelectFile = (file) => {
    setMode("edit");
    setSelectedFile(file);
    setFileContent(file.content || "");
    setCommitMessage(`Update ${file.path}`);
    setStatusMsg("");
    setErrorMsg("");
  };

  const handleStartManualCreate = () => {
    setMode("create");
    setSelectedFile(null);
    setNewFilePath("");
    setFileContent("// Write your code here\n");
    setCommitMessage("Create new file");
    setStatusMsg("");
    setErrorMsg("");
  };

  const handleStartUpload = () => {
    setMode("upload");
    setSelectedFile(null);
    setUploadedFiles([]);
    setCommitMessage("Upload files from computer");
    setStatusMsg("");
    setErrorMsg("");
  };

  // ── Process uploaded files from computer ─────────────────────────────────────
  const processFiles = async (fileList) => {
    const filesArray = Array.from(fileList);
    if (!filesArray.length) return;

    setErrorMsg("");
    setStatusMsg("");

    const parsedList = [];
    for (const file of filesArray) {
      try {
        const text = await file.text();
        const cleanName = file.name;
        const fullPath = folderPrefix
          ? `${folderPrefix.replace(/^\/+|\/+$/g, "")}/${cleanName}`
          : cleanName;

        parsedList.push({
          name: cleanName,
          path: fullPath,
          content: text,
          size: file.size,
        });
      } catch (err) {
        console.error("Failed to read file:", file.name, err);
      }
    }

    if (parsedList.length > 0) {
      setUploadedFiles((prev) => [...prev, ...parsedList]);
      if (parsedList.length === 1) {
        setCommitMessage(`Upload ${parsedList[0].name}`);
        setFileContent(parsedList[0].content);
      } else {
        setCommitMessage(`Upload ${parsedList.length} files from computer`);
        setFileContent(parsedList[0].content);
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveUploadedFile = (index) => {
    const updated = uploadedFiles.filter((_, idx) => idx !== index);
    setUploadedFiles(updated);
    if (updated.length > 0) {
      setCommitMessage(`Upload ${updated.length} file(s)`);
      setFileContent(updated[0].content);
    } else {
      setCommitMessage("Upload files from computer");
      setFileContent("");
    }
  };

  const handleUpdateUploadedPath = (index, newPath) => {
    const updated = [...uploadedFiles];
    updated[index].path = newPath;
    setUploadedFiles(updated);
  };

  // ── Commit Changes ──────────────────────────────────────────────────────────
  const handleCommit = async (e) => {
    e.preventDefault();
    if (!commitMessage.trim()) {
      setErrorMsg("Please provide a commit message");
      return;
    }

    setCommitting(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      let filesToCommit = [];

      if (mode === "upload") {
        if (uploadedFiles.length === 0) {
          setErrorMsg("Please select or drop at least one file to upload");
          setCommitting(false);
          return;
        }
        filesToCommit = uploadedFiles.map((f) => ({
          path: f.path,
          content: f.content,
        }));
      } else {
        const path = mode === "create" ? newFilePath.trim() : selectedFile?.path;
        if (!path) {
          setErrorMsg("File path is required");
          setCommitting(false);
          return;
        }
        filesToCommit = [
          {
            path,
            content: fileContent,
          },
        ];
      }

      await api.post(`/repos/${repoId}/branches/${branchId}/commits`, {
        message: commitMessage,
        files: filesToCommit,
      });

      setStatusMsg(`Success: ${filesToCommit.length} file(s) committed to '${branch?.name}'!`);
      setUploadedFiles([]);
      setMode("edit");
      await loadData();
    } catch (err) {
      setErrorMsg(err.message || "Failed to commit changes");
    } finally {
      setCommitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-[#7d8590] font-mono text-xs">
        Loading editor...
      </div>
    );
  }

  const activePath =
    mode === "create"
      ? newFilePath || "untitled.js"
      : mode === "upload"
      ? `${uploadedFiles.length} file(s) ready to upload`
      : selectedFile?.path || "untitled.js";

  return (
    <div className="bg-[#0d1117] min-h-screen text-[#e6edf3]">
      <RepoHeader repo={repo} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Breadcrumb Path & Action Buttons Bar */}
        <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to={`/repos/${repoId}`} className="text-[#58a6ff] hover:underline font-semibold">
              {repo?.name}
            </Link>
            <span className="text-[#7d8590]">/</span>
            <span className="branch-pill">
              <GitBranch className="w-3 h-3 inline mr-1" />
              {branch?.name}
            </span>
            <span className="text-[#7d8590]">/</span>
            <span className="font-mono text-[#c9d1d9] font-medium">{activePath}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={mode === "create" ? "primary" : "secondary"}
              icon={Plus}
              onClick={handleStartManualCreate}
            >
              Create new file
            </Button>
            <Button
              size="sm"
              variant={mode === "upload" ? "primary" : "secondary"}
              icon={Upload}
              onClick={handleStartUpload}
            >
              Upload files
            </Button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 rounded-md bg-[rgba(46,160,67,0.15)] border border-[rgba(46,160,67,0.4)] text-[#3fb950] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-md bg-[rgba(248,81,73,0.15)] border border-[rgba(248,81,73,0.4)] text-[#f85149] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File Tree on Left */}
          <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
            <div className="px-3.5 py-2.5 bg-[#161b22] border-b border-[#30363d] font-semibold text-[#e6edf3] flex items-center justify-between">
              <span>Files in {branch?.name}</span>
              <span className="text-[11px] text-[#7d8590] font-mono">{branch?.files?.length || 0}</span>
            </div>
            <div className="divide-y divide-[#21262d]">
              {(!branch?.files || branch.files.length === 0) ? (
                <div className="p-4 text-center text-[#7d8590] italic">
                  No files in branch yet
                </div>
              ) : (
                branch.files.map((f, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectFile(f)}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left font-mono transition-colors ${
                      mode === "edit" && selectedFile?.path === f.path
                        ? "bg-[#161b22] text-[#58a6ff] font-semibold"
                        : "text-[#c9d1d9] hover:bg-[#161b22]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-3.5 h-3.5 text-[#7d8590] shrink-0" />
                      <span className="truncate">{f.path}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Editor / Upload View on Right */}
          <div className="lg:col-span-3 space-y-4">
            {/* ── MODE 1: UPLOAD FILES FROM COMPUTER ── */}
            {mode === "upload" && (
              <div className="space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                    isDragging
                      ? "border-[#58a6ff] bg-[rgba(56,139,253,0.1)]"
                      : "border-[#30363d] bg-[#161b22]/50 hover:border-[#7d8590]"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center text-[#58a6ff]">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#e6edf3]">
                        Drag and drop your code files here
                      </h4>
                      <p className="text-xs text-[#7d8590] mt-1">
                        Select JavaScript, Python, TypeScript, HTML, CSS, JSON, or any code files from your computer
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Upload}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose files from computer
                    </Button>
                  </div>
                </div>

                {/* Destination Directory (Folder Prefix) */}
                <div className="border border-[#30363d] rounded-md bg-[#161b22] p-3 text-xs flex items-center gap-3">
                  <FolderPlus className="w-4 h-4 text-[#7d8590] shrink-0" />
                  <div className="flex-1">
                    <label className="block text-[11px] text-[#7d8590] font-semibold mb-0.5">
                      Destination folder prefix (optional):
                    </label>
                    <input
                      type="text"
                      value={folderPrefix}
                      onChange={(e) => {
                        const newPrefix = e.target.value;
                        setFolderPrefix(newPrefix);
                        setUploadedFiles((prev) =>
                          prev.map((f) => ({
                            ...f,
                            path: newPrefix
                              ? `${newPrefix.replace(/^\/+|\/+$/g, "")}/${f.name}`
                              : f.name,
                          }))
                        );
                      }}
                      placeholder="e.g. src/auth or controllers"
                      className="w-full h-7 px-2.5 rounded bg-[#0d1117] border border-[#30363d] font-mono text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                    />
                  </div>
                </div>

                {/* Staged Uploaded Files Roster */}
                {uploadedFiles.length > 0 && (
                  <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden text-xs">
                    <div className="px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-[#7d8590]">
                      <span className="font-semibold text-[#e6edf3]">
                        Files staged for upload ({uploadedFiles.length})
                      </span>
                      <span>Click to preview content</span>
                    </div>

                    <div className="divide-y divide-[#21262d]">
                      {uploadedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[#161b22]/50"
                        >
                          <div className="flex items-center gap-2.5 flex-1">
                            <FileCode className="w-4 h-4 text-[#58a6ff] shrink-0" />
                            <div className="flex-1">
                              <input
                                type="text"
                                value={file.path}
                                onChange={(e) => handleUpdateUploadedPath(idx, e.target.value)}
                                className="w-full h-6 px-2 rounded bg-[#161b22] border border-[#30363d] font-mono text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                              />
                            </div>
                            <span className="text-[11px] font-mono text-[#7d8590] shrink-0">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                setFileContent(file.content);
                              }}
                              className="text-[11px] text-[#58a6ff] hover:underline"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUploadedFile(idx)}
                              className="p-1 text-[#7d8590] hover:text-[#f85149] transition-colors"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── MODE 2: MANUAL CREATE FILE ── */}
            {mode === "create" && (
              <div className="border border-[#30363d] rounded-md bg-[#161b22] p-3 text-xs">
                <label className="block text-[#7d8590] font-semibold mb-1">
                  New File Path (with folder and extension):
                </label>
                <input
                  type="text"
                  required
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="src/auth/jwt.js"
                  className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] font-mono text-xs text-[#e6edf3] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
            )}

            {/* Code Editor / Preview Box */}
            <div className="border border-[#30363d] rounded-md bg-[#0d1117] overflow-hidden">
              <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs text-[#7d8590]">
                <span className="font-mono text-[#c9d1d9] flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#58a6ff]" />
                  {mode === "upload" ? "File Content Preview" : activePath}
                </span>
                <span className="font-mono text-[11px]">{fileContent.split("\n").length} lines</span>
              </div>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                readOnly={mode === "upload" && uploadedFiles.length === 0}
                rows={16}
                placeholder={mode === "upload" ? "Select a file to preview its content here..." : "// Add your code here"}
                className="w-full p-4 bg-[#0d1117] font-mono text-xs text-[#e6edf3] focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* GitHub Classic Commit Form */}
            <form
              onSubmit={handleCommit}
              className="border border-[#30363d] rounded-md bg-[#161b22] p-4 text-xs space-y-3"
            >
              <h4 className="font-semibold text-sm text-[#e6edf3]">
                {mode === "upload"
                  ? `Commit ${uploadedFiles.length} uploaded file(s)`
                  : "Commit changes"}
              </h4>

              <div>
                <input
                  type="text"
                  required
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message"
                  className="w-full h-8 px-3 rounded-md bg-[#0d1117] border border-[#30363d] text-xs text-[#e6edf3] placeholder-[#7d8590] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-[#30363d]">
                <Button
                  variant="primary"
                  type="submit"
                  loading={committing}
                  icon={GitCommit}
                  disabled={mode === "upload" && uploadedFiles.length === 0}
                >
                  {mode === "upload"
                    ? `Commit ${uploadedFiles.length} file(s)`
                    : "Commit changes"}
                </Button>
                <Link to={`/repos/${repoId}`}>
                  <Button variant="secondary" type="button">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
