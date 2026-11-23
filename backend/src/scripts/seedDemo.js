import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { Repo } from "../models/repo.model.js";
import { Branch } from "../models/branch.model.js";
import { PullRequest } from "../models/pr.model.js";
import { ReviewStage } from "../models/stage.model.js";
import { CodeCheckResult } from "../models/precheck.model.js";
import { SLAConfig } from "../models/slaConfig.model.js";

const SEED_PASSWORD = "Waypoint@123";

async function runSeed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB ✅");

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

  // 1. Clean existing demo data (if any)
  console.log("Clearing previous demo records...");
  const demoEmails = [
    "alice@waypoint.dev",
    "bob@waypoint.dev",
    "charlie@waypoint.dev",
    "diana@waypoint.dev",
    "dave@waypoint.dev",
    "dan@waypoint.dev",
  ];
  await User.deleteMany({ email: { $in: demoEmails } });
  await Repo.deleteMany({ name: "waypoint-core-platform" });

  // 2. Create Users with realistic commit histories for ML ranking
  console.log("Seeding engineers with expertise histories...");
  const users = await User.insertMany([
    {
      fullName: "Alice Chen (Auth Specialist)",
      username: "alice_auth",
      email: "alice@waypoint.dev",
      password: hashedPassword,
      role: "REVIEWER",
      isVerified: true,
      currentOpenReviews: 1,
      expertiseTags: ["auth", "jwt", "oauth", "security"],
      commitHistory: [
        { message: "feat: add jwt auth strategy", files: ["src/auth/jwt.js", "src/middlewares/auth.middleware.js"] },
        { message: "fix: session token expiry", files: ["src/auth/session.js", "src/auth/oauth.js"] },
      ],
    },
    {
      fullName: "Bob Martinez (Database Architect)",
      username: "bob_db",
      email: "bob@waypoint.dev",
      password: hashedPassword,
      role: "REVIEWER",
      isVerified: true,
      currentOpenReviews: 1,
      expertiseTags: ["database", "mongodb", "indexes", "mongoose"],
      commitHistory: [
        { message: "perf: compound index on stage prId", files: ["src/models/stage.model.js", "src/models/user.model.js"] },
        { message: "refactor: optimize pr query cursor", files: ["src/models/pr.model.js", "src/db/migrate.js"] },
      ],
    },
    {
      fullName: "Charlie Zhang (DevOps & Infra)",
      username: "charlie_infra",
      email: "charlie@waypoint.dev",
      password: hashedPassword,
      role: "REVIEWER",
      isVerified: true,
      currentOpenReviews: 0,
      expertiseTags: ["docker", "k8s", "infra", "deploy"],
      commitHistory: [
        { message: "ci: multi-stage docker build", files: ["Dockerfile", "docker-compose.yml"] },
        { message: "helm: production replica config", files: ["k8s/deployment.yaml", "k8s/service.yaml"] },
      ],
    },
    {
      fullName: "Diana Prince (Lead Security Signoff)",
      username: "diana_sec",
      email: "diana@waypoint.dev",
      password: hashedPassword,
      role: "REVIEWER",
      isVerified: true,
      currentOpenReviews: 0,
      expertiseTags: ["security", "signoff", "audit"],
      commitHistory: [
        { message: "audit: sanitize mongo operators", files: ["src/security/sanitizer.js", "src/auth/jwt.js"] },
      ],
    },
    {
      fullName: "Dave Miller (Team Lead)",
      username: "dave_lead",
      email: "dave@waypoint.dev",
      password: hashedPassword,
      role: "TEAM_LEAD",
      isVerified: true,
      currentOpenReviews: 0,
      commitHistory: [],
    },
    {
      fullName: "Dan Developer",
      username: "dan_dev",
      email: "dan@waypoint.dev",
      password: hashedPassword,
      role: "DEVELOPER",
      isVerified: true,
      currentOpenReviews: 0,
      commitHistory: [],
    },
  ]);

  const [alice, bob, charlie, diana, dave, dan] = users;

  // 3. Create Sample Repository
  console.log("Seeding repository with DAG stage rules...");
  const repo = await Repo.create({
    name: "waypoint-core-platform",
    description: "Enterprise microservices platform with automated DAG code reviews",
    ownerId: dave._id,
    teamLeadId: dave._id,
    members: users.map((u) => u._id),
    stageRules: [
      { pattern: "src/auth/**", stageType: "AUTH_REVIEW" },
      { pattern: "src/models/**", stageType: "DB_REVIEW" },
      { pattern: "Dockerfile*", stageType: "INFRA_REVIEW" },
    ],
  });

  // 4. Configure SLA for this repo
  await SLAConfig.create({
    repoId: repo._id,
    stageSLAs: [
      { stageType: "AUTH_REVIEW", hoursAllowed: 24 },
      { stageType: "DB_REVIEW", hoursAllowed: 24 },
      { stageType: "INFRA_REVIEW", hoursAllowed: 48 },
      { stageType: "SECURITY_SIGNOFF", hoursAllowed: 24 },
      { stageType: "GENERAL_REVIEW", hoursAllowed: 24 },
    ],
  });

  // 5. Seed Branches: main, develop, feature/oauth2-and-rbac
  console.log("Seeding branches and file snapshots...");
  const mainBranch = await Branch.create({
    repoId: repo._id,
    name: "main",
    files: [
      { path: "src/auth/jwt.js", content: "// standard jwt strategy\nexport const verify = () => {};\n" },
      { path: "src/models/user.model.js", content: "// basic user schema\nexport const schema = {};\n" },
      { path: "Dockerfile", content: "FROM node:20-alpine\nWORKDIR /app\n" },
    ],
  });

  const developBranch = await Branch.create({
    repoId: repo._id,
    name: "develop",
    files: [...mainBranch.files],
  });

  const featureBranch = await Branch.create({
    repoId: repo._id,
    name: "feature/oauth2-and-rbac",
    files: [
      {
        path: "src/auth/jwt.js",
        content: `// enhanced jwt auth strategy with refresh token rotation
import jwt from "jsonwebtoken";
export const generateTokens = (user) => {
  const access = jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
  const refresh = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
  return { access, refresh };
};
`,
      },
      {
        path: "src/models/user.model.js",
        content: `// extended user schema with role permissions and compound index
import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ["DEVELOPER", "REVIEWER", "TEAM_LEAD"], default: "DEVELOPER" },
  currentOpenReviews: { type: Number, default: 0, index: true },
});
export const User = mongoose.model("User", userSchema);
`,
      },
      {
        path: "Dockerfile",
        content: `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
EXPOSE 8000
CMD ["node", "dist/index.js"]
`,
      },
    ],
  });

  // 6. Create Demo Pull Request
  console.log("Seeding Pull Request and unified diff...");
  const unifiedDiff = `diff --git a/src/auth/jwt.js b/src/auth/jwt.js
--- a/src/auth/jwt.js
+++ b/src/auth/jwt.js
@@ -1,2 +1,8 @@
-// standard jwt strategy
-export const verify = () => {};
+// enhanced jwt auth strategy with refresh token rotation
+import jwt from "jsonwebtoken";
+export const generateTokens = (user) => {
+  const access = jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
+  const refresh = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
+  return { access, refresh };
+};
diff --git a/src/models/user.model.js b/src/models/user.model.js
--- a/src/models/user.model.js
+++ b/src/models/user.model.js
@@ -1,2 +1,9 @@
-// basic user schema
-export const schema = {};
+// extended user schema with role permissions and compound index
+import mongoose from "mongoose";
+const userSchema = new mongoose.Schema({
+  email: { type: String, required: true, unique: true, index: true },
+  role: { type: String, enum: ["DEVELOPER", "REVIEWER", "TEAM_LEAD"], default: "DEVELOPER" },
+  currentOpenReviews: { type: Number, default: 0, index: true },
+});
+export const User = mongoose.model("User", userSchema);
`;

  const pr = await PullRequest.create({
    repoId: repo._id,
    fromBranch: featureBranch._id,
    toBranch: developBranch._id,
    title: "feat: add Google OAuth2, token rotation & RBAC session model",
    description: "Implements modern OAuth token rotation, role boundaries, and schema compound indices for review DAG performance.",
    authorId: dan._id,
    diff: unifiedDiff,
    changedPaths: ["src/auth/jwt.js", "src/models/user.model.js", "Dockerfile"],
    stageTypes: ["AUTH_REVIEW", "DB_REVIEW", "INFRA_REVIEW", "SECURITY_SIGNOFF"],
    status: "REVIEW_PENDING",
  });

  // 7. Seed Layer 3 Pre-Check Results (LangGraph simulation)
  await CodeCheckResult.create({
    prId: pr._id,
    status: "ISSUES_FOUND",
    summary: "LangGraph Pipeline: 2 static checks passed. 1 non-blocking warning detected regarding token expiry configuration.",
    issues: [
      {
        type: "Security Best Practice",
        severity: "WARNING",
        file: "src/auth/jwt.js",
        line: 4,
        description: "Ensure ACCESS_TOKEN_SECRET is injected via Vault or secure KMS in production.",
      },
    ],
  });

  // 8. Seed DAG Stages (Layer 1 + Layer 2)
  console.log("Seeding DAG stages with topological dependencies...");
  const deadline = new Date(Date.now() + 24 * 3600 * 1000);

  await ReviewStage.insertMany([
    {
      prId: pr._id,
      repoId: repo._id,
      stageType: "AUTH_REVIEW",
      status: "IN_PROGRESS",
      assignedReviewers: [alice._id],
      dependsOn: [],
      slaDeadline: deadline,
    },
    {
      prId: pr._id,
      repoId: repo._id,
      stageType: "DB_REVIEW",
      status: "IN_PROGRESS",
      assignedReviewers: [bob._id],
      dependsOn: [],
      slaDeadline: deadline,
    },
    {
      prId: pr._id,
      repoId: repo._id,
      stageType: "INFRA_REVIEW",
      status: "IN_PROGRESS",
      assignedReviewers: [charlie._id],
      dependsOn: [],
      slaDeadline: new Date(Date.now() + 48 * 3600 * 1000),
    },
    {
      prId: pr._id,
      repoId: repo._id,
      stageType: "SECURITY_SIGNOFF",
      status: "BLOCKED",
      assignedReviewers: [diana._id],
      dependsOn: ["AUTH_REVIEW", "DB_REVIEW"], // Topological dependency!
      slaDeadline: null,
    },
  ]);

  console.log("\n=======================================================");
  console.log("🎉 DEMO ENVIRONMENT SEEDED SUCCESSFULLY!");
  console.log("=======================================================");
  console.log("Demo Credentials (Password for all: Waypoint@123):");
  console.log("  • Team Lead : dave@waypoint.dev");
  console.log("  • Developer : dan@waypoint.dev");
  console.log("  • Reviewers : alice@waypoint.dev (Auth), bob@waypoint.dev (DB)");
  console.log("                charlie@waypoint.dev (Infra), diana@waypoint.dev (Sec)");
  console.log("\nSample PR ID: " + pr._id);
  console.log("Sample Repo ID: " + repo._id);
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

runSeed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
