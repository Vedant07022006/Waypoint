import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // 1. Delete all non-gmail users (like seeded @waypoint.dev users)
  const deleteResult = await mongoose.connection.collection("users").deleteMany({
    email: { $not: /@gmail\.com$/i }
  });
  console.log(`Deleted ${deleteResult.deletedCount} non-gmail/seed users.`);

  // 2. Configure the 6 real users with exact roles and metadata
  const userConfigs = [
    {
      email: "kathiriyaom2005@gmail.com",
      role: "team_lead",
      fullName: "Om Kathiriya",
      expertiseTags: ["architecture", "lead", "management", "fullstack"],
    },
    {
      email: "vedantkathiriya2006@gmail.com",
      role: "developer",
      fullName: "Vedant kathiriya",
      expertiseTags: ["fullstack", "react", "node", "typescript"],
    },
    {
      email: "vrushabhkathiriya@gmail.com",
      role: "reviewer",
      fullName: "Vrushabh Kathiriya",
      expertiseTags: ["auth", "security", "jwt", "tokens", "middleware"],
      commitHistory: [
        { files: ["src/auth/jwt.js", "src/middlewares/auth.js"], message: "Implement token auth & refresh rotation" },
        { files: ["src/routes/auth.routes.js", "src/controllers/auth.controller.js"], message: "OAuth2 and session hardening" }
      ]
    },
    {
      email: "vedantp5860@gmail.com",
      role: "reviewer",
      fullName: "Dwarkesh Vaghasiya",
      expertiseTags: ["database", "db", "sql", "mongo", "prisma", "models"],
      commitHistory: [
        { files: ["src/models/user.model.js", "src/models/repo.model.js"], message: "Schema indexing & optimization" },
        { files: ["src/db/connection.js", "src/migrations/init.sql"], message: "Database pooling & connection failover" }
      ]
    },
    {
      email: "vedantkathiriya0702@gmail.com",
      role: "reviewer",
      fullName: "Jenish Rakholiya",
      expertiseTags: ["infra", "devops", "docker", "ci", "cd", "kubernetes"],
      commitHistory: [
        { files: ["Dockerfile", "docker-compose.yml", "deploy.sh"], message: "Containerize microservices stack" },
        { files: [".github/workflows/ci.yml", "nginx.conf"], message: "Setup CI pipeline and reverse proxy" }
      ]
    },
    {
      email: "vedant.work0702@gmail.com",
      role: "reviewer",
      fullName: "Nishit Patel",
      expertiseTags: ["frontend", "ui", "ux", "react", "css", "components"],
      commitHistory: [
        { files: ["frontend/src/components/common/Navbar.jsx", "frontend/src/pages/DashboardPage.jsx"], message: "Dark mode UI and navigation" },
        { files: ["frontend/src/components/pr/DAGStagePipeline.jsx"], message: "Interactive DAG stage pipeline visualization" }
      ]
    }
  ];

  for (const config of userConfigs) {
    const res = await mongoose.connection.collection("users").updateOne(
      { email: config.email },
      {
        $set: {
          role: config.role,
          fullName: config.fullName,
          expertiseTags: config.expertiseTags,
          commitHistory: config.commitHistory || [],
          isActive: true,
          isVerified: true,
          currentOpenReviews: 0
        }
      }
    );
    console.log(`Updated ${config.email} -> role: ${config.role} (matched: ${res.matchedCount})`);
  }

  // 3. Clear stale/test auth collections and project data so DB is fresh
  const collectionsToClear = [
    "refreshtokens",
    "sessions",
    "otps",
    "repos",
    "branches",
    "commits",
    "pullrequests",
    "reviewstages",
    "codecheckresults",
    "slaconfigs"
  ];

  for (const col of collectionsToClear) {
    try {
      const res = await mongoose.connection.collection(col).deleteMany({});
      console.log(`Cleared collection ${col}: removed ${res.deletedCount} items`);
    } catch (e) {
      // Collection may not exist yet
    }
  }

  // 4. Print final users in DB
  const finalUsers = await mongoose.connection.collection("users").find({}).toArray();
  console.log(`\nFINAL USERS IN DB (${finalUsers.length}):`);
  finalUsers.forEach(u => {
    console.log(` - ${u.fullName} (${u.email}) [${u.role}] | Username: @${u.username} | Expertise: ${u.expertiseTags?.join(", ")}`);
  });

  await mongoose.disconnect();
  console.log("\nDatabase successfully configured!");
}

run().catch(err => {
  console.error("Setup error:", err);
  process.exit(1);
});
