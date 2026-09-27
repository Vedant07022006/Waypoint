# Waypoint — Project Structure, Implementation Order & Development Rules

---

## Table of Contents

1. [Development Rules (Must Follow Always)](#1-development-rules-must-follow-always)
2. [Full Folder Structure](#2-full-folder-structure)
3. [Module Implementation Order](#3-module-implementation-order)
4. [Module Details — What Each File Does](#4-module-details--what-each-file-does)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Inter-Service Communication Map](#6-inter-service-communication-map)

---

## 1. Development Rules (Must Follow Always)

> These rules apply to **every single file** written in this project. No exceptions.

### 1.1 No Hardcoded Values — Ever
```
❌ const SECRET = "mysupersecret"
❌ const DB_URL = "mongodb://localhost:27017/waypoint"
❌ const PORT = 5000

✅ const SECRET = process.env.JWT_SECRET
✅ const DB_URL = process.env.MONGODB_URI
✅ const PORT = process.env.PORT || 5000
```
Every secret, URL, port, and configurable value lives in `.env` only.

---

### 1.2 Validate Every Incoming Request
```
Every API route must validate its input before the controller runs.
Use: express-validator (backend) / zod (frontend forms)

❌ router.post('/register', authController.register)

✅ router.post('/register', validateRegister, authController.register)
   // validateRegister checks: email format, password length, role is valid enum
```

---

### 1.3 Proper Error Handling — No Silent Failures
```javascript
// Every async controller uses try-catch
// Never let an unhandled promise rejection crash the server

❌ exports.createRepo = async (req, res) => {
     const repo = await Repo.create(req.body);   // crashes if DB fails
     res.json(repo);
   }

✅ exports.createRepo = async (req, res, next) => {
     try {
       const repo = await Repo.create(req.body);
       res.status(201).json({ success: true, data: repo });
     } catch (error) {
       next(error);   // passes to global error handler
     }
   }
```

A **global error handler** in `app.js` catches all forwarded errors and returns consistent JSON:
```json
{ "success": false, "message": "...", "statusCode": 400 }
```

---

### 1.4 Consistent API Response Shape
```javascript
// Every response follows the same structure — no exceptions

// Success
{ "success": true,  "data": { ... },      "message": "Repo created" }

// Error
{ "success": false, "message": "Repo not found", "statusCode": 404 }

// Paginated list
{ "success": true,  "data": [...], "pagination": { "page": 1, "total": 50 } }
```

---

### 1.5 No Business Logic in Controllers
```
Controller  → receives request, calls service, sends response
Service     → all business logic lives here
Model       → database queries only

❌ Controller doing logic:
   const stages = pr.changedPaths.map(p => detectStage(p))  // wrong place

✅ Controller delegates:
   const stages = await prService.detectStages(pr.changedPaths)
```

---

### 1.6 No console.log — Use a Logger
```javascript
❌ console.log("PR created:", prId)
❌ console.error("DB error:", err)

✅ logger.info("PR created", { prId, userId })
✅ logger.error("DB error during PR creation", { error: err.message, prId })
```
Use **winston** logger with log levels: `error | warn | info | debug`
Logs written to console in dev, to file in production.

---

### 1.7 Always Use Async/Await — Never Callback Hell
```javascript
❌ Repo.find({}, function(err, repos) {
     if (err) { ... }
     Branch.find({ repoId }, function(err2, branches) { ... })
   })

✅ const repos = await Repo.find({});
   const branches = await Branch.find({ repoId });
```

---

### 1.8 MongoDB: Always Add Indexes for Queried Fields
```javascript
// In every Mongoose schema, index fields that are frequently queried

❌ prId: { type: String }
✅ prId: { type: String, index: true }

// Compound index example
reviewStageSchema.index({ prId: 1, status: 1 });
```

---

### 1.9 Protect All Routes With Auth Middleware
```javascript
// Public routes: /api/auth/register, /api/auth/login
// Everything else: must have valid JWT

❌ router.get('/repos', repoController.list)
✅ router.get('/repos', protect, repoController.list)

// Role-specific routes
✅ router.post('/pullrequests/:id/merge', protect, authorize('developer', 'owner'), mergeController.merge)
```

---

### 1.10 Frontend Rules
```
- No API URLs hardcoded in components → use a central api.js service file
- No fetch() directly in components → all API calls go through service functions
- All async operations show loading state and handle error state
- No inline styles → all styles in CSS modules or a global CSS file
- Every interactive element has a unique id attribute (for testing)
- Forms use controlled components with validation before submit
```

---

### 1.11 Python Service Rules
```
- All config via environment variables (python-dotenv)
- All endpoints return consistent JSON: { "success": bool, "data": {...} }
- Input validation on every FastAPI endpoint using Pydantic models
- LangChain/LangGraph errors are caught and returned as structured errors
- Never hardcode the LLM API key or model name
```

---

### 1.12 Git Commit Message Convention (for your own commits)
```
feat: add branch creation API
fix: correct SLA deadline calculation for security stages
refactor: move diff logic from controller to service
docs: update API reference for PR endpoints
chore: add express-validator to dependencies
```

---

## 2. Full Folder Structure

```
waypoint/
│
├── backend/                          # Node.js + Express
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.js
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.service.js
│   │   │   │   ├── auth.validator.js
│   │   │   │   └── auth.model.js          # User / Reviewer schema
│   │   │   │
│   │   │   ├── repository/
│   │   │   │   ├── repo.routes.js
│   │   │   │   ├── repo.controller.js
│   │   │   │   ├── repo.service.js
│   │   │   │   ├── repo.validator.js
│   │   │   │   └── repo.model.js
│   │   │   │
│   │   │   ├── branch/
│   │   │   │   ├── branch.routes.js
│   │   │   │   ├── branch.controller.js
│   │   │   │   ├── branch.service.js
│   │   │   │   ├── branch.validator.js
│   │   │   │   └── branch.model.js
│   │   │   │
│   │   │   ├── commit/
│   │   │   │   ├── commit.routes.js
│   │   │   │   ├── commit.controller.js
│   │   │   │   ├── commit.service.js
│   │   │   │   ├── commit.validator.js
│   │   │   │   └── commit.model.js
│   │   │   │
│   │   │   ├── pullRequest/
│   │   │   │   ├── pr.routes.js
│   │   │   │   ├── pr.controller.js
│   │   │   │   ├── pr.service.js
│   │   │   │   ├── pr.validator.js
│   │   │   │   ├── pr.model.js
│   │   │   │   └── diff.util.js           # diff generation logic
│   │   │   │
│   │   │   ├── stage/                     # Layer 1 — DAG + Scheduling
│   │   │   │   ├── stage.routes.js
│   │   │   │   ├── stage.controller.js
│   │   │   │   ├── stage.service.js       # topological scheduler lives here
│   │   │   │   ├── stage.validator.js
│   │   │   │   └── stage.model.js
│   │   │   │
│   │   │   ├── reviewer/
│   │   │   │   ├── reviewer.routes.js
│   │   │   │   ├── reviewer.controller.js
│   │   │   │   ├── reviewer.service.js
│   │   │   │   └── reviewer.model.js
│   │   │   │
│   │   │   ├── assignment/                # Layer 2 — ML ranking bridge
│   │   │   │   ├── assignment.routes.js
│   │   │   │   ├── assignment.controller.js
│   │   │   │   ├── assignment.service.js  # calls ML Python service
│   │   │   │   └── assignment.model.js    # assignmentHistory schema
│   │   │   │
│   │   │   ├── precheck/                  # Layer 3 — Pre-check bridge
│   │   │   │   ├── precheck.routes.js
│   │   │   │   ├── precheck.controller.js
│   │   │   │   ├── precheck.service.js    # calls Python pre-check service
│   │   │   │   └── precheck.model.js      # codeCheckResults schema
│   │   │   │
│   │   │   ├── sla/                       # SLA engine
│   │   │   │   ├── sla.service.js         # SLA calculation logic
│   │   │   │   └── sla.cron.js            # node-cron job — runs every 15 min
│   │   │   │
│   │   │   └── dashboard/
│   │   │       ├── dashboard.routes.js
│   │   │       ├── dashboard.controller.js
│   │   │       └── dashboard.service.js   # aggregation queries
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js         # protect() — verifies JWT
│   │   │   ├── authorize.middleware.js    # authorize(roles) — role check
│   │   │   ├── error.middleware.js        # global error handler
│   │   │   ├── rateLimiter.middleware.js  # express-rate-limit config
│   │   │   └── validate.middleware.js     # runs express-validator checks
│   │   │
│   │   ├── config/
│   │   │   ├── db.js                      # MongoDB connection
│   │   │   ├── socket.js                  # Socket.io setup + room logic
│   │   │   └── logger.js                  # Winston logger config
│   │   │
│   │   ├── utils/
│   │   │   ├── apiResponse.js             # sendSuccess(), sendError() helpers
│   │   │   ├── asyncHandler.js            # wraps async controllers with try-catch
│   │   │   ├── stageDetector.js           # file path + LLM → stage type mapping
│   │   │   └── diffGenerator.js           # wrapper around 'diff' npm package
│   │   │
│   │   └── app.js                         # Express app setup, route mounting
│   │
│   ├── server.js                          # Entry point — starts HTTP + Socket.io
│   ├── .env                               # Environment variables (never commit)
│   ├── .env.example                       # Template for env vars (commit this)
│   └── package.json
│
├── frontend/                             # React App
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   ├── authService.js         # API calls for auth
│   │   │   │   └── useAuth.js             # auth state hook
│   │   │   │
│   │   │   ├── repository/
│   │   │   │   ├── RepoListPage.jsx
│   │   │   │   ├── RepoDetailPage.jsx
│   │   │   │   ├── CreateRepoModal.jsx
│   │   │   │   ├── StageRulesConfig.jsx   # Owner sets file pattern → stage rules
│   │   │   │   └── repoService.js
│   │   │   │
│   │   │   ├── branch/
│   │   │   │   ├── BranchListPage.jsx
│   │   │   │   ├── CreateBranchModal.jsx
│   │   │   │   └── branchService.js
│   │   │   │
│   │   │   ├── editor/
│   │   │   │   ├── EditorPage.jsx         # Main code editor view
│   │   │   │   ├── FileTree.jsx           # Left sidebar file tree
│   │   │   │   ├── EditorTabs.jsx         # Open file tabs
│   │   │   │   ├── CommitPanel.jsx        # Commit message + push button
│   │   │   │   └── editorService.js
│   │   │   │
│   │   │   ├── pullRequest/
│   │   │   │   ├── PRListPage.jsx
│   │   │   │   ├── PRDetailPage.jsx       # Main PR view with timeline
│   │   │   │   ├── CreatePRModal.jsx
│   │   │   │   ├── DiffViewer.jsx         # Shows diff with syntax highlight
│   │   │   │   ├── PrecheckPanel.jsx      # Shows Layer 3 results
│   │   │   │   ├── StageOverride.jsx      # Developer can add/remove stages
│   │   │   │   └── prService.js
│   │   │   │
│   │   │   ├── review/
│   │   │   │   ├── DAGVisualization.jsx   # react-flow live DAG
│   │   │   │   ├── StageCard.jsx          # Single stage with SLA countdown
│   │   │   │   ├── ReviewerPanel.jsx      # Explainability: why this reviewer
│   │   │   │   ├── SLACountdown.jsx       # Live timer component
│   │   │   │   ├── ReviewPage.jsx         # Reviewer's view of a stage
│   │   │   │   └── reviewService.js
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   ├── DeveloperDashboard.jsx
│   │   │   │   ├── ReviewerDashboard.jsx
│   │   │   │   ├── TeamLeadDashboard.jsx
│   │   │   │   ├── FairnessChart.jsx      # Load distribution chart
│   │   │   │   ├── EscalationPanel.jsx    # Team lead escalation alerts
│   │   │   │   └── dashboardService.js
│   │   │   │
│   │   │   └── notification/
│   │   │       ├── NotificationBell.jsx
│   │   │       ├── NotificationList.jsx
│   │   │       └── useSocket.js           # Socket.io connection hook
│   │   │
│   │   ├── components/                   # Shared UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Badge.jsx                  # Status badges (READY, BLOCKED, etc.)
│   │   │   ├── Spinner.jsx
│   │   │   ├── ErrorMessage.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js                     # Axios instance with base URL + JWT header
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSocket.js               # Global Socket.io hook
│   │   │   └── useLocalStorage.js
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx            # Global auth state
│   │   │
│   │   ├── App.jsx                        # Route definitions
│   │   ├── main.jsx                       # Entry point
│   │   └── index.css                      # Global styles
│   │
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── precheck-service/                     # Python — Layer 3 (LangGraph)
│   ├── app/
│   │   ├── main.py                        # FastAPI app entry point
│   │   ├── routes/
│   │   │   └── precheck.py               # POST /run endpoint
│   │   ├── graph/
│   │   │   ├── state.py                  # ReviewState TypedDict
│   │   │   ├── nodes/
│   │   │   │   ├── parse_diff.py         # Parse diff node
│   │   │   │   ├── rule_check.py         # Rule compliance LangChain call
│   │   │   │   ├── bug_check.py          # Bug pattern LangChain call
│   │   │   │   ├── security_check.py     # Security pattern LangChain call
│   │   │   │   ├── merge_results.py      # Combine all findings
│   │   │   │   └── classify_severity.py  # BLOCKING / WARNING / PASS
│   │   │   └── pipeline.py              # LangGraph graph definition
│   │   ├── schemas/
│   │   │   └── request.py               # Pydantic input models
│   │   └── config.py                    # env vars (GROQ_API_KEY, etc.)
│   │
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
├── ml-service/                          # Python — Layer 2 (ML Ranking)
│   ├── app/
│   │   ├── main.py                       # FastAPI app entry point
│   │   ├── routes/
│   │   │   └── rank.py                  # POST /rank endpoint
│   │   ├── models/
│   │   │   ├── expertise.py             # TF-IDF expertise profiling
│   │   │   ├── ranking.py               # Logistic Regression ranking
│   │   │   └── fallback.py              # Rule-based fallback scorer
│   │   ├── schemas/
│   │   │   └── request.py               # Pydantic input/output models
│   │   ├── training/
│   │   │   └── train.py                 # Retrain model from assignmentHistory
│   │   └── config.py
│   │
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
└── README.md
```

---

## 3. Module Implementation Order

Follow this sequence **strictly**. Each module depends on the previous one being complete.

---

### Phase 0 — Project Scaffolding
**Goal:** Empty but runnable project with all config wired up.

```
Order:
1. Create folder structure (backend/, frontend/, precheck-service/, ml-service/)
2. backend/  → npm init, install all dependencies, setup app.js + server.js
3. backend/  → setup config/db.js (MongoDB connection with error handling)
4. backend/  → setup config/logger.js (Winston)
5. backend/  → setup middleware/error.middleware.js (global error handler)
6. backend/  → setup utils/apiResponse.js + utils/asyncHandler.js
7. backend/  → setup .env + .env.example
8. frontend/ → create React app (Vite), install dependencies, setup api.js
9. precheck-service/ → FastAPI skeleton, .env, requirements.txt
10. ml-service/      → FastAPI skeleton, .env, requirements.txt
```

**Done when:** `npm run dev` starts the backend, React app loads in browser, both Python services start without errors.

---

### Phase 1 — Auth Module
**Goal:** Users can register, login, get JWT token. Already built — integrate it.

```
Files to create/integrate:
1. auth.model.js       → User schema with roles
2. auth.validator.js   → validate register + login inputs
3. auth.service.js     → register(), login(), getMe()
4. auth.controller.js  → thin — delegates to service
5. auth.routes.js      → POST /register, POST /login, GET /me
6. auth.middleware.js  → protect() function
7. authorize.middleware.js → authorize(...roles) function
8. Frontend: LoginPage, RegisterPage, AuthContext, ProtectedRoute
```

**Done when:** Can register a user, login, and access a protected route with JWT.

---

### Phase 2 — Repository Module
**Goal:** Create repos, invite members, define stage rules, auto-create main + develop branches.

```
Files to create:
1. repo.model.js       → repo schema with stageRules[]
2. branch.model.js     → branch schema with files[]
3. repo.validator.js
4. repo.service.js     → createRepo() auto-creates main + develop branches
5. repo.controller.js
6. repo.routes.js      → POST /repos, GET /repos, GET /repos/:id
7. Frontend: RepoListPage, RepoDetailPage, CreateRepoModal, StageRulesConfig
```

**Done when:** Owner can create a repo, set stage rules, see it in the list.

---

### Phase 3 — Branch + Commit Module
**Goal:** Create feature branches, write code in Monaco, commit to branch.

```
Files to create:
1. branch.routes.js + controller + service + validator
2. commit.model.js     → commit schema with files[] snapshot
3. commit.routes.js + controller + service + validator
4. utils/diffGenerator.js  → wrapper around 'diff' npm package
5. Frontend: BranchListPage, CreateBranchModal
6. Frontend: EditorPage, FileTree, EditorTabs, CommitPanel
   (Monaco Editor integration goes here)
```

**Done when:** Developer can create a branch, write code in Monaco editor, commit files, see commit history.

---

### Phase 4 — Pull Request Module
**Goal:** Open PR, generate diff, detect stages, trigger pre-check.

```
Files to create:
1. pr.model.js            → PR schema
2. pr.service.js          → createPR(): diff generation + stage detection
3. utils/stageDetector.js → file pattern matching + LLM fallback
4. precheck.model.js      → codeCheckResults schema
5. precheck.service.js    → calls Python pre-check service via axios
6. precheck.routes.js     → POST /precheck/result (callback from Python)
7. pr.routes.js + controller + validator
8. Frontend: PRListPage, CreatePRModal, PrecheckPanel, StageOverride
9. Frontend: DiffViewer component
```

**Done when:** PR opens, diff is generated, pre-check runs and shows results to developer.

---

### Phase 5 — Layer 3 (Python Pre-Check Service)
**Goal:** Full LangGraph pipeline running and returning structured results.

```
Files to create (precheck-service/):
1. schemas/request.py          → Pydantic models
2. graph/state.py              → ReviewState TypedDict
3. graph/nodes/parse_diff.py
4. graph/nodes/rule_check.py
5. graph/nodes/bug_check.py
6. graph/nodes/security_check.py
7. graph/nodes/merge_results.py
8. graph/nodes/classify_severity.py
9. graph/pipeline.py           → wire all nodes into LangGraph graph
10. routes/precheck.py         → POST /run endpoint
11. main.py                    → FastAPI app
```

**Done when:** Send a PR diff to the Python service → get back structured JSON with violations, severity, summary.

---

### Phase 6 — Stage Module + Layer 1 (DAG Scheduling)
**Goal:** Stages created from PR, topological scheduler assigns order, stages unlock correctly.

```
Files to create:
1. stage.model.js      → reviewStage schema
2. stage.service.js    → createStagesForPR(), getReadyStages(), completeStage()
3. stage.controller.js → complete, request-changes, escalate endpoints
4. stage.routes.js
5. config/socket.js    → Socket.io setup, room joining logic
6. Frontend: DAGVisualization (react-flow), StageCard, SLACountdown
7. Frontend: ReviewPage (reviewer's view of a stage + diff)
```

**Done when:** After pre-check passes, stages are created with correct dependencies, DAG renders live in UI, completing a stage unlocks dependent stages in real-time.

---

### Phase 7 — Layer 2 (Python ML Ranking Service)
**Goal:** TF-IDF expertise profiling + Logistic Regression picks best reviewer per stage.

```
Files to create (ml-service/):
1. schemas/request.py         → Pydantic input/output models
2. models/expertise.py        → TF-IDF vectorizer
3. models/fallback.py         → rule-based scorer (cold start)
4. models/ranking.py          → Logistic Regression (with cold-start switch)
5. routes/rank.py             → POST /rank endpoint
6. training/train.py          → retrain from assignmentHistory data
7. main.py

Backend — assignment module:
8. assignment.model.js        → assignmentHistory schema
9. assignment.service.js      → calls ML service, saves history
10. assignment.routes.js
11. Frontend: ReviewerPanel (explainability — why this reviewer)
```

**Done when:** When a stage becomes READY, ML service picks best reviewer, shows explainability breakdown in UI, logs outcome to assignmentHistory.

---

### Phase 8 — SLA Engine + Escalation
**Goal:** SLA timers count down, expired stages get reassigned, 3+ failures escalate to team lead.

```
Files to create:
1. sla/sla.service.js       → calculateSLA(), checkExpiredStages(), reassignStage()
2. sla/sla.cron.js          → node-cron job, runs every 15 min, calls sla.service
3. Frontend: SLACountdown component wired to live Socket.io events
4. Frontend: EscalationPanel in TeamLeadDashboard
```

**Done when:** SLA expires → stage reassigns automatically → after 3 reassigns → team lead gets escalation notification.

---

### Phase 9 — Merge Flow + Dashboard
**Goal:** Approved PR merges into develop, Team Lead merges develop into main, fairness dashboard works.

```
Files to create:
1. pr.service.js → mergePR() function (file snapshot copy)
2. Dashboard: dashboard.service.js → aggregation queries
3. Frontend: DeveloperDashboard, ReviewerDashboard, TeamLeadDashboard
4. Frontend: FairnessChart (review load distribution chart)
5. Frontend: NotificationBell + NotificationList
```

**Done when:** Full end-to-end flow works — PR opens → pre-check → stages → reviews → merge → dashboard shows history.

---

### Phase 10 — Polish + Demo Prep
```
1. Add "Trigger SLA Expiry Now" button (demo only — bypasses timer)
2. Seed MongoDB with synthetic data for ML cold-start demo
3. Add ML fallback indicator badge in UI
4. Add PR audit trail view (full timeline of all events)
5. Error boundary components in React
6. Loading states on all async operations
7. Rate limiting on all API routes
8. Final UI polish
```

---

## 4. Module Details — What Each File Does

### Backend File Responsibilities

| File | Responsibility |
|---|---|
| `*.routes.js` | Define URL paths + HTTP methods + attach validators + call controller |
| `*.controller.js` | Extract data from req, call service, send response using apiResponse utils |
| `*.service.js` | All business logic — DB queries, calculations, calling other services |
| `*.validator.js` | express-validator chains — define what valid input looks like |
| `*.model.js` | Mongoose schema + model export + indexes |
| `middleware/auth.middleware.js` | Verify JWT token, attach user to req.user |
| `middleware/authorize.middleware.js` | Check req.user.role against allowed roles |
| `middleware/error.middleware.js` | Catch all forwarded errors, return consistent JSON |
| `utils/asyncHandler.js` | Wraps async function in try-catch so controllers don't repeat try-catch |
| `utils/apiResponse.js` | sendSuccess(res, data, msg) and sendError(res, msg, code) helpers |
| `utils/stageDetector.js` | Given changed file paths + repo rules → return stage types array |
| `utils/diffGenerator.js` | Given two file arrays → return unified diff string |
| `config/socket.js` | Initialize Socket.io, define room join logic, export emit helpers |
| `sla/sla.cron.js` | Scheduled job — queries all ASSIGNED stages, checks deadlines, triggers reassignment |

---

### Frontend File Responsibilities

| File | Responsibility |
|---|---|
| `services/api.js` | Single Axios instance with baseURL + auto-attach JWT header from localStorage |
| `*.Service.js` (per feature) | All API calls for that feature — components never call Axios directly |
| `context/AuthContext.jsx` | Global user state, login/logout functions, persists to localStorage |
| `hooks/useSocket.js` | Connects to Socket.io, joins repo room, exposes event listener hook |
| `components/ProtectedRoute.jsx` | Redirects to login if no valid JWT |
| `features/editor/EditorPage.jsx` | Manages file tree state, open tabs, Monaco editor, commit panel |
| `features/review/DAGVisualization.jsx` | Renders react-flow graph, updates in real-time from Socket.io events |
| `features/review/SLACountdown.jsx` | Counts down from slaDeadline, shows progress bar, fires warning at 20% |

---

## 5. Environment Variables Reference

### backend/.env.example
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/waypoint

# Auth
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# Python Services
PRECHECK_SERVICE_URL=http://localhost:8001
ML_SERVICE_URL=http://localhost:8002

# Logging
LOG_LEVEL=debug
```

### precheck-service/.env.example
```env
PORT=8001
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192
NODE_BACKEND_CALLBACK_URL=http://localhost:5000/api/precheck/result
```

### ml-service/.env.example
```env
PORT=8002
MIN_HISTORY_FOR_ML=10
DEFAULT_LAMBDA=0.3
```

### frontend/.env.example
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 6. Inter-Service Communication Map

```
┌──────────────────────────────────────────────────────────────┐
│                    Service Communication                      │
│                                                              │
│  Frontend (React :3000)                                      │
│    │                                                         │
│    ├── REST API ──────────► Backend (Node.js :5000)          │
│    └── WebSocket ─────────► Backend (Socket.io :5000)        │
│                                   │                          │
│                    ┌──────────────┤                          │
│                    │              │                          │
│                    ▼              ▼                          │
│         Pre-Check Service    ML Service                      │
│         (Python :8001)       (Python :8002)                  │
│                    │                                         │
│                    └──── POST callback ──► Backend           │
│                         /api/precheck/result                 │
│                                                              │
│  All backend → Python calls: axios POST with JSON body       │
│  Python → backend callback: httpx POST with JSON body        │
│  Frontend → backend: Axios with JWT Bearer token header      │
│  Real-time: Socket.io rooms named repo_{repoId}             │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Start Checklist

Before writing the first line of code, confirm:

- [ ] `.env` files created for all three services
- [ ] MongoDB running locally (or Atlas connection string ready)
- [ ] Groq API key obtained (free at console.groq.com)
- [ ] Node.js v18+ installed
- [ ] Python 3.11+ installed
- [ ] All folder structure created
- [ ] Git repo initialized with `.gitignore` (that excludes all `.env` files)

---

*Follow the phases in order. Do not start Phase N+1 until Phase N is fully working and tested.*
*Every file written must follow the Development Rules in Section 1.*
