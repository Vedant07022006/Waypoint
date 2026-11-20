import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";

const SEED_PASSWORD = "Waypoint@123";

async function runSeed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB ✅");

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

  const teamEmails = [
    "lead@waypoint.dev",
    "dev@waypoint.dev",
    "reviewer.auth@waypoint.dev",
    "reviewer.db@waypoint.dev",
    "reviewer.infra@waypoint.dev",
    "reviewer.sec@waypoint.dev",
  ];

  console.log("Clearing previous team records (if any)...");
  await User.deleteMany({ email: { $in: teamEmails } });

  console.log("Seeding exact team: 1 Team Lead, 1 Developer, 4 Reviewers...");
  const users = await User.insertMany([
    {
      fullName: "Alex Rivera (Team Lead)",
      username: "alex_lead",
      email: "lead@waypoint.dev",
      passwordHash: hashedPassword,
      role: "team_lead",
      isVerified: true,
      currentOpenReviews: 0,
      commitHistory: [],
    },
    {
      fullName: "Daniel Kim (Developer)",
      username: "daniel_dev",
      email: "dev@waypoint.dev",
      passwordHash: hashedPassword,
      role: "developer",
      isVerified: true,
      currentOpenReviews: 0,
      commitHistory: [],
    },
    {
      fullName: "Alice Chen (Auth Specialist)",
      username: "alice_auth",
      email: "reviewer.auth@waypoint.dev",
      passwordHash: hashedPassword,
      role: "reviewer",
      isVerified: true,
      currentOpenReviews: 0,
      expertiseTags: ["auth", "jwt", "oauth", "security"],
      commitHistory: [
        { message: "feat: add jwt auth strategy", files: ["src/auth/jwt.js", "src/middlewares/auth.middleware.js"] },
        { message: "fix: session token expiry", files: ["src/auth/session.js", "src/auth/oauth.js"] },
      ],
    },
    {
      fullName: "Bob Martinez (Database Architect)",
      username: "bob_db",
      email: "reviewer.db@waypoint.dev",
      passwordHash: hashedPassword,
      role: "reviewer",
      isVerified: true,
      currentOpenReviews: 0,
      expertiseTags: ["database", "mongodb", "indexes", "mongoose"],
      commitHistory: [
        { message: "perf: compound index on stage prId", files: ["src/models/stage.model.js", "src/models/user.model.js"] },
        { message: "refactor: optimize pr query cursor", files: ["src/models/pr.model.js", "src/db/migrate.js"] },
      ],
    },
    {
      fullName: "Charlie Zhang (DevOps & Infra)",
      username: "charlie_infra",
      email: "reviewer.infra@waypoint.dev",
      passwordHash: hashedPassword,
      role: "reviewer",
      isVerified: true,
      currentOpenReviews: 0,
      expertiseTags: ["docker", "k8s", "infra", "deploy"],
      commitHistory: [
        { message: "ci: multi-stage docker build", files: ["Dockerfile", "docker-compose.yml"] },
        { message: "helm: production replica config", files: ["k8s/deployment.yaml", "k8s/service.yaml"] },
      ],
    },
    {
      fullName: "Diana Prince (Security Signoff)",
      username: "diana_sec",
      email: "reviewer.sec@waypoint.dev",
      passwordHash: hashedPassword,
      role: "reviewer",
      isVerified: true,
      currentOpenReviews: 0,
      expertiseTags: ["security", "signoff", "audit"],
      commitHistory: [
        { message: "audit: sanitize mongo operators", files: ["src/security/sanitizer.js", "src/auth/jwt.js"] },
      ],
    },
  ]);

  console.log("\n========================================================");
  console.log("Team accounts successfully created! 🎉");
  console.log("Password for all accounts:", SEED_PASSWORD);
  console.log("========================================================");
  users.forEach((u) => {
    console.log(`- [${u.role.toUpperCase()}] ${u.fullName}: ${u.email}`);
  });
  console.log("========================================================\n");

  await mongoose.disconnect();
}

runSeed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
