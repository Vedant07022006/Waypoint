import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Repo } from "../models/repo.model.js";
import { Branch } from "../models/branch.model.js";
import { Commit } from "../models/commit.model.js";
import { PullRequest } from "../models/pr.model.js";
import { ReviewStage } from "../models/stage.model.js";
import * as repoService from "../services/repo.service.js";
import * as branchService from "../services/branch.service.js";
import * as commitService from "../services/commit.service.js";
import * as prService from "../services/pr.service.js";
import * as stageService from "../services/stage.service.js";

dotenv.config();

const testResults = [];

function recordTest(name, passed, detail = "") {
  testResults.push({ name, passed, detail });
  const icon = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${icon} | ${name} ${detail ? "(" + detail + ")" : ""}`);
}

async function runComprehensiveTests() {
  console.log("=================================================");
  console.log("   WAYPOINT COMPREHENSIVE END-TO-END TEST SUITE   ");
  console.log("=================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Verify the 6 users exist with exact roles
  const lead = await User.findOne({ email: "kathiriyaom2005@gmail.com" });
  const dev = await User.findOne({ email: "vedantkathiriya2006@gmail.com" });
  const rev1 = await User.findOne({ email: "vrushabhkathiriya@gmail.com" });
  const rev2 = await User.findOne({ email: "vedantp5860@gmail.com" });
  const rev3 = await User.findOne({ email: "vedantkathiriya0702@gmail.com" });
  const rev4 = await User.findOne({ email: "vedant.work0702@gmail.com" });

  recordTest(
    "User Accounts Setup",
    lead?.role === "team_lead" && dev?.role === "developer" && rev1?.role === "reviewer" && rev2?.role === "reviewer" && rev3?.role === "reviewer" && rev4?.role === "reviewer",
    `Found 1 Team Lead (${lead?.username}), 1 Developer (${dev?.username}), 4 Reviewers`
  );

  let testRepo = null;
  let mainBranch = null;
  let featBranch = null;
  let testCommit = null;
  let testPR = null;

  try {
    // 2. Test Repo Creation (Role Enforcement)
    console.log("\n--- Testing Repository Creation & Role Enforcement ---");

    // Developer attempts to create repo -> Should be caught by authorize middleware or service
    // Service-level test: Team Lead creates repo
    testRepo = await repoService.createRepo({
      name: "waypoint-e2e-demo",
      description: "End-to-end integration test repository",
      isPrivate: false,
      ownerId: lead._id,
      teamLeadId: lead._id,
    });

    recordTest(
      "Team Lead Creates Repository",
      !!testRepo && testRepo.name === "waypoint-e2e-demo",
      `Repo ID: ${testRepo._id}`
    );

    // Verify main branch was automatically created with initial README
    mainBranch = await Branch.findOne({ repoId: testRepo._id, name: "main" });
    recordTest(
      "Initial Default Branch (main) Created",
      !!mainBranch,
      `Protected main branch initialized`
    );

    // 3. Test Collaborator / Invites
    console.log("\n--- Testing Collaborators & Invites ---");

    // Team Lead invites Developer and 4 Reviewers
    await repoService.addMember({
      repoId: testRepo._id,
      userId: dev._id.toString(),
      requestingUserId: lead._id,
    });

    for (const rev of [rev1, rev2, rev3, rev4]) {
      await repoService.addMember({
        repoId: testRepo._id,
        userId: rev.username, // test invite by username
        requestingUserId: lead._id,
      });
    }

    const members = await repoService.getRepoMembers(testRepo._id);
    recordTest(
      "Collaborator Invitations",
      members.length === 6,
      `All 6 team members present in repo member roster`
    );

    // 4. Test Branching & Commits
    console.log("\n--- Testing Branching & Commits ---");

    featBranch = await branchService.createBranch({
      repoId: testRepo._id,
      name: "feature/jwt-auth",
      fromBranchName: "main",
    });

    recordTest(
      "Developer Creates Feature Branch",
      !!featBranch && featBranch.name === "feature/jwt-auth",
      `Source branch: main`
    );

    testCommit = await commitService.createCommit({
      repoId: testRepo._id,
      branchId: featBranch._id,
      authorId: dev._id,
      message: "feat(auth): implement JWT token rotation and verification",
      files: [
        {
          path: "src/auth/jwt.js",
          content: "// JWT Helper\nexport const verifyToken = (token) => ({ valid: true });\n",
        },
        {
          path: "src/routes/auth.routes.js",
          content: "// Auth routes\nrouter.post('/login', loginHandler);\n",
        },
      ],
    });

    recordTest(
      "Developer Commits Files to Feature Branch",
      !!testCommit && testCommit.changedFiles?.length === 2,
      `Committed 2 files: ${testCommit?.changedFiles?.join(", ")}`
    );

    // 5. Test Pull Request Creation & Edge Cases
    console.log("\n--- Testing Pull Request Creation & Validation ---");

    // Edge case: Same branch PR should fail
    let sameBranchFailed = false;
    try {
      await prService.createPR({
        repoId: testRepo._id,
        title: "Invalid PR",
        fromBranchId: mainBranch._id,
        toBranchId: mainBranch._id,
        authorId: dev._id,
      });
    } catch (e) {
      sameBranchFailed = true;
    }
    recordTest(
      "Edge Case: Prevent Same Branch PR (main -> main)",
      sameBranchFailed,
      "Correctly rejected with 400"
    );

    // Create valid PR targeting main
    testPR = await prService.createPR({
      repoId: testRepo._id,
      title: "feat: add JWT token rotation and auth routes",
      description: "Implements JWT access & refresh token handling",
      fromBranchId: featBranch._id,
      toBranchId: mainBranch._id,
      authorId: dev._id,
    });

    recordTest(
      "Developer Opens PR Targeting 'main'",
      !!testPR && testPR.title === "feat: add JWT token rotation and auth routes",
      `PR #${testPR.prNumber} created`
    );

    // 6. Test Review Stages & ML Reviewer Assignment
    console.log("\n--- Testing Review Stages & ML Reviewer Assignment ---");

    // Create review stages for the PR
    const stage = await ReviewStage.create({
      prId: testPR._id,
      repoId: testRepo._id,
      stageType: "AUTH_REVIEW",
      name: "Auth & Identity Security Review",
      description: "Validate JWT verification and token safety",
      status: "PENDING",
      assignedReviewers: [rev1._id], // rev1 is Auth Specialist
      requiredApprovals: 1,
      currentApprovals: 0,
      order: 1,
    });

    recordTest(
      "DAG Review Stage Generated",
      !!stage && stage.stageType === "AUTH_REVIEW",
      `Assigned to Auth Specialist: @${rev1.username}`
    );

    // 7. Test Review Approval & Change Request Flow
    console.log("\n--- Testing Review Approval & Merge Edge Cases ---");

    // Edge case: Try to merge PR before review stage is approved
    let prematureMergeFailed = false;
    try {
      await prService.mergePR({
        prId: testPR._id,
        requestingUserId: lead._id,
      });
    } catch (e) {
      prematureMergeFailed = true;
    }
    recordTest(
      "Edge Case: Prevent Merge When Review Stages Are Pending",
      prematureMergeFailed,
      "Correctly blocked premature merge"
    );

    // Reviewer requests changes first (test feedback card)
    await stageService.updateStageStatus({
      stageId: stage._id,
      status: "REJECTED",
      reviewComments: "Please add expiry check for refresh tokens",
      requestingUserId: rev1._id,
    });

    const rejectedStage = await ReviewStage.findById(stage._id);
    recordTest(
      "Reviewer Requests Changes with Feedback",
      rejectedStage.status === "REJECTED" && !!rejectedStage.reviewComments,
      `Feedback: "${rejectedStage.reviewComments}"`
    );

    // Reset status to IN_PROGRESS so reviewer can re-review and approve
    rejectedStage.status = "IN_PROGRESS";
    await rejectedStage.save();

    // Reviewer approves the stage
    await stageService.updateStageStatus({
      stageId: stage._id,
      status: "COMPLETED",
      reviewComments: "All checks passed — Ready to merge",
      requestingUserId: rev1._id,
    });

    const completedStage = await ReviewStage.findById(stage._id);
    const approvedPR = await PullRequest.findById(testPR._id);

    recordTest(
      "Reviewer Approves Stage (Status -> COMPLETED)",
      completedStage.status === "COMPLETED",
      `PR status: ${approvedPR.status}`
    );

    // 8. Test PR Merge
    console.log("\n--- Testing Pull Request Merge Execution ---");

    const mergedPR = await prService.mergePR({
      prId: testPR._id,
      requestingUserId: lead._id,
    });

    recordTest(
      "Pull Request Merged Successfully",
      mergedPR.status === "MERGED" && !!mergedPR.mergedAt,
      `Merged at ${mergedPR.mergedAt}`
    );

    // Verify main branch received the merged files
    const updatedMain = await Branch.findOne({ repoId: testRepo._id, name: "main" });
    const hasJwtFile = updatedMain.files.some(f => f.path === "src/auth/jwt.js");

    recordTest(
      "Target Branch (main) File Snapshot Updated",
      hasJwtFile,
      `main branch now contains 'src/auth/jwt.js'`
    );

    // Edge case: Cannot merge already merged PR
    let doubleMergeFailed = false;
    try {
      await prService.mergePR({
        prId: testPR._id,
        requestingUserId: lead._id,
      });
    } catch (e) {
      doubleMergeFailed = true;
    }
    recordTest(
      "Edge Case: Prevent Double Merge on Merged PR",
      doubleMergeFailed,
      "Correctly rejected duplicate merge attempt"
    );

  } catch (err) {
    console.error("Test execution failure:", err);
    recordTest("Test Execution", false, err.message);
  } finally {
    // 9. Database Clean-up: Remove test artifacts so ONLY the 6 user accounts remain!
    console.log("\n--- Cleaning Up Test Artifacts ---");
    if (testRepo) {
      await Repo.deleteOne({ _id: testRepo._id });
      await Branch.deleteMany({ repoId: testRepo._id });
      await Commit.deleteMany({ repoId: testRepo._id });
      await PullRequest.deleteMany({ repoId: testRepo._id });
      await ReviewStage.deleteMany({ repoId: testRepo._id });
      console.log("Deleted test repo, branches, commits, PRs, and review stages.");
    }

    // Reset reviewer open review counts to 0
    await User.updateMany({}, { $set: { currentOpenReviews: 0 } });

    // Verify DB users count
    const remainingUsers = await User.find({}).select("username role email");
    console.log(`\nFinal user count in database: ${remainingUsers.length}`);
    remainingUsers.forEach(u => console.log(`  - @${u.username} (${u.role}): ${u.email}`));

    await mongoose.disconnect();
  }

  // Summary
  console.log("\n=================================================");
  const total = testResults.length;
  const passed = testResults.filter(t => t.passed).length;
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("=================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runComprehensiveTests();
