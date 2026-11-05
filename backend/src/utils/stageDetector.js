/**
 * stageDetector.js
 *
 * Maps changed file paths → review stage types using the repo's configured
 * stageRules[]. Falls back to GENERAL_REVIEW if no pattern matches a file.
 *
 * Special combination rule (from WORKFLOW.md):
 *   AUTH_REVIEW + DB_REVIEW together → also auto-add SECURITY_SIGNOFF
 */

/**
 * detectStages(changedPaths, stageRules)
 *
 * @param {string[]} changedPaths   - File paths that changed in this PR
 * @param {Array<{pattern: string, stage: string}>} stageRules
 *   - Repo-specific rules. pattern is a regex string stored in DB.
 *   - Falls back to DEFAULT_STAGE_RULES if stageRules is empty.
 * @returns {string[]} - Unique array of stage type strings
 */
export const detectStages = (changedPaths = [], stageRules = []) => {
    if (changedPaths.length === 0) {
        return ["GENERAL_REVIEW"];
    }

    const rules = stageRules.length > 0 ? stageRules : DEFAULT_STAGE_RULES;
    const detected = new Set();

    for (const filePath of changedPaths) {
        let matched = false;

        for (const rule of rules) {
            try {
                const regex = new RegExp(rule.pattern);
                if (regex.test(filePath)) {
                    detected.add(rule.stage);
                    matched = true;
                }
            } catch {
                // Invalid regex pattern — skip silently (validator should catch these)
            }
        }

        // If no rule matched this file, it needs a general review
        if (!matched) {
            detected.add("GENERAL_REVIEW");
        }
    }

    // ── Combination rule ──────────────────────────────────────────────────────
    // A PR touching both auth AND database code is implicitly security-sensitive.
    // Automatically add SECURITY_SIGNOFF as a blocking final stage.
    if (detected.has("AUTH_REVIEW") && detected.has("DB_REVIEW")) {
        detected.add("SECURITY_SIGNOFF");
    }

    return [...detected];
};

// ── Default stage rules ───────────────────────────────────────────────────────
// Used when a repo has no custom rules configured.
// These match the patterns defined in WORKFLOW.md.
const DEFAULT_STAGE_RULES = [
    { pattern: "src/auth/",       stage: "AUTH_REVIEW"      },
    { pattern: "src/middleware/", stage: "AUTH_REVIEW"      },
    { pattern: "src/db/",         stage: "DB_REVIEW"        },
    { pattern: "src/models/",     stage: "DB_REVIEW"        },
    { pattern: "(infrastructure/|Dockerfile)", stage: "INFRA_REVIEW" },
    { pattern: "\\.env",          stage: "SECURITY_SIGNOFF" },
    { pattern: "src/payments/",   stage: "SECURITY_SIGNOFF" },
];
