# 🎓 6th of October University (O6U) — Secure Exam Platform

An enterprise on-premise university examination system built for 6th of October University. It empowers course instructors and teaching assistants to construct objective exams and quizzes from a difficulty-calibrated question bank, generating randomized, unique papers for every student while preserving uniform mathematical grading equity, server-authoritative proctoring, and instant auto-grading.

---

## 🏛️ System Architecture

```text
                               +-----------------------------+
                               | React Web SPA (TailwindCSS) |
                               +--------------+--------------+
                                              |
                                      HTTPS / WebSocket
                                              |
                               +--------------v--------------+
                               |     Nginx Reverse Proxy     |
                               +--------------+--------------+
                                              |
                        +---------------------+---------------------+
                        |                                           |
             +----------v----------+                     +----------v----------+
             |   NestJS REST API   |                     | Socket.io Proctor   |
             |   (Auth, Exam, Qs)  |                     | (Live Lab Monitor)  |
             +----------+----------+                     +----------+----------+
                        |                                           |
                        +---------------------+---------------------+
                                              |
                                 +------------v------------+
                                 |  Data Layer (Prisma ORM)|
                                 |  PostgreSQL / Embedded  |
                                 +-------------------------+
```

---

## 🚀 Key Features

1. **SSO Isolation (`AuthProvider`)**: University credentials verification layer isolated behind an interface, pre-configured with `MockAuthProvider` for immediate demonstration.
2. **Difficulty Slot Architecture**: Exams define difficulty recipes (e.g. 4 Easy @ 2 pts, 4 Medium @ 3 pts, 2 Hard @ 5 pts). Total score is tied to difficulty slots rather than individual questions, ensuring uniform grading fairness.
3. **Question Bank Sufficiency Guard (FR-6)**: Verifies the question bank has sufficient questions for each difficulty slot before permitting exam publication, pinpointing exact deficits.
4. **Unique Paper Generation & Snapshotting (FR-9, FR-10)**: Generates randomized papers for each student. Each question's text and options are frozen in an immutable `questionSnapshot` at start time, immune to subsequent bank edits.
5. **Server-Authoritative Countdown & Resumption (FR-11, FR-12)**: Remaining time is calculated server-side from `started_at` timestamp. Network interruptions resume seamlessly without progress or time loss.
6. **Live Proctoring & Anti-Cheat Telemetry (FR-13, FR-14, FR-16)**: Fullscreen enforcement, blur/tab-switch, and clipboard copy/paste detection streamed via Socket.io to the instructor's live dashboard.
7. **Strict Student Grade Privacy (FR-15, FR-21)**: Post-submission screens lock the attempt and confirm submission without displaying scores or answers.
8. **Excel Grade Sheet Export (FR-20, Section 6.7)**: Formatted spreadsheet export using `ExcelJS` containing Course Name/Code, Student Name, University ID, Final Score, Submission Time, and Violations count.
9. **Load Testing with Grafana k6**: Conforming to `k6-test-maintenance` guidelines, modeling concurrent student waves, autosave storms, and submission thresholds (`p(95) < 500ms`).

---

## 👤 Pre-configured Demo Accounts

| Role | University ID | Default Password | Persona Name |
|---|---|---|---|
| **Doctor** | `DOC01` (or `doctor.ahmed`) | `password123` | Dr. Ahmed Mansour |
| **Teaching Assistant** | `TA01` (or `ta.mona`) | `password123` | Eng. Mona El-Sayed |
| **Student 1** | `20260001` | `password123` | Omar Khaled Hassan |
| **Student 2** | `20260002` | `password123` | Mariam Youssef Mostafa |
| **Student 3** | `20260003` | `password123` | Youssef Karim Ibrahim |
| **Administrator** | `ADMIN01` (or `admin`) | `password123` | Prof. Tarek El-Kady |

*(The login screen also features a 1-click Quick Role Switcher for seamless testing).*

---

## 🛠️ Development & Running Locally

### Prerequisites
- Node.js 20+ installed
- npm 10+

### Step 1: Install & Build Workspaces
```bash
# Install root dependencies
npm install

# Build shared library
npm run build --workspace=@fable/shared

# Build API & Web
npm run build
```

### Step 2: Run Development Servers
```bash
# In terminal 1: Run Backend API (Port 4000)
npm run dev:api

# In terminal 2: Run Frontend Web (Port 3000)
npm run dev:web
```
Open your browser at **`http://localhost:3000`**.

---

## 🐳 Docker Production Stack

To deploy the entire on-premise stack inside the university lab network:

```bash
docker compose -f infra/docker/docker-compose.yml up --build -d
```

Services:
- **`nginx`**: Port 80 (Unified reverse proxy)
- **`web`**: React production build
- **`api`**: NestJS application cluster
- **`postgres`**: PostgreSQL 16 Alpine
- **`redis`**: Redis 7 Alpine

---

## 📈 Performance & Load Testing (k6)

Run the load test suite:
```bash
k6 run tests/k6/exam-load-test.js
```
Validates:
- `http_req_duration`: 95% under 500ms
- `exam_errors`: Error rate < 1%
- Attempt generation, debounced autosave, and auto-grading under concurrent load.
