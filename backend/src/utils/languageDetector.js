// Utility to calculate language distribution based on file extensions and byte sizes

export const LANGUAGE_MAP = {
    js: { name: "JavaScript", color: "#f1e05a" },
    jsx: { name: "JavaScript", color: "#f1e05a" },
    mjs: { name: "JavaScript", color: "#f1e05a" },
    cjs: { name: "JavaScript", color: "#f1e05a" },
    ts: { name: "TypeScript", color: "#3178c6" },
    tsx: { name: "TypeScript", color: "#3178c6" },
    py: { name: "Python", color: "#3572A5" },
    java: { name: "Java", color: "#b07219" },
    cpp: { name: "C++", color: "#f34b7d" },
    cc: { name: "C++", color: "#f34b7d" },
    cxx: { name: "C++", color: "#f34b7d" },
    c: { name: "C", color: "#555555" },
    h: { name: "C/C++ Header", color: "#555555" },
    hpp: { name: "C/C++ Header", color: "#555555" },
    cs: { name: "C#", color: "#178600" },
    go: { name: "Go", color: "#00ADD8" },
    rs: { name: "Rust", color: "#dea584" },
    php: { name: "PHP", color: "#4F5D95" },
    rb: { name: "Ruby", color: "#701516" },
    html: { name: "HTML", color: "#e34c26" },
    htm: { name: "HTML", color: "#e34c26" },
    css: { name: "CSS", color: "#563d7c" },
    scss: { name: "SCSS", color: "#c6538c" },
    sql: { name: "SQL", color: "#e38c00" },
    sh: { name: "Shell", color: "#89e051" },
    bash: { name: "Shell", color: "#89e051" },
    json: { name: "JSON", color: "#292929" },
    md: { name: "Markdown", color: "#083fa1" },
    yml: { name: "YAML", color: "#cb171e" },
    yaml: { name: "YAML", color: "#cb171e" },
    dockerfile: { name: "Dockerfile", color: "#384d54" },
};

export const detectLanguages = (files = []) => {
    if (!Array.isArray(files) || files.length === 0) {
        return { languages: [], primaryLanguage: null };
    }

    const counts = {};
    let totalBytes = 0;

    for (const file of files) {
        const filePath = file.path || "";
        const lower = filePath.toLowerCase();
        let ext = "";

        if (lower.endsWith("dockerfile")) {
            ext = "dockerfile";
        } else {
            const parts = lower.split(".");
            if (parts.length > 1) {
                ext = parts.pop();
            }
        }

        const langInfo = LANGUAGE_MAP[ext];
        if (!langInfo) continue;

        const size = file.content ? Buffer.byteLength(file.content, "utf8") : 1;
        if (!counts[langInfo.name]) {
            counts[langInfo.name] = {
                name: langInfo.name,
                color: langInfo.color,
                bytes: 0,
            };
        }
        counts[langInfo.name].bytes += size;
        totalBytes += size;
    }

    if (totalBytes === 0) {
        return { languages: [], primaryLanguage: null };
    }

    const languages = Object.values(counts)
        .map((lang) => ({
            name: lang.name,
            color: lang.color,
            bytes: lang.bytes,
            percentage: Number(((lang.bytes / totalBytes) * 100).toFixed(1)),
        }))
        .sort((a, b) => b.bytes - a.bytes);

    return {
        languages,
        primaryLanguage: languages.length > 0 ? languages[0] : null,
    };
};
