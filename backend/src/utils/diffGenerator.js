import { createTwoFilesPatch } from "diff";

/**
 * generateDiff(fromFiles, toFiles)
 *
 * Compares two file snapshot arrays and produces:
 *   - unifiedDiff  : unified diff string across all changed files (sent to pre-check service)
 *   - changedPaths : array of file paths that changed (used by stageDetector)
 *
 * @param {Array<{path: string, content: string}>} fromFiles  — source branch files
 * @param {Array<{path: string, content: string}>} toFiles    — target (PR) branch files
 * @returns {{ unifiedDiff: string, changedPaths: string[] }}
 */
export const generateDiff = (fromFiles = [], toFiles = []) => {
    const fromMap = new Map(fromFiles.map((f) => [f.path, f.content || ""]));
    const toMap   = new Map(toFiles.map((f)   => [f.path, f.content || ""]));

    // Union of all paths across both snapshots
    const allPaths = new Set([...fromMap.keys(), ...toMap.keys()]);

    let unifiedDiff = "";
    const changedPaths = [];

    for (const filePath of allPaths) {
        const oldContent = fromMap.get(filePath) ?? "";
        const newContent = toMap.get(filePath)   ?? "";

        if (oldContent === newContent) continue; // unchanged — skip

        changedPaths.push(filePath);

        // createTwoFilesPatch produces a standard unified diff block per file
        const patch = createTwoFilesPatch(
            `a/${filePath}`,
            `b/${filePath}`,
            oldContent,
            newContent,
            "",
            "",
            { context: 3 }
        );

        unifiedDiff += patch;
    }

    return { unifiedDiff, changedPaths };
};
