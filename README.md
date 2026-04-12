# IntelliCodeRev — AI Security Scanner

Multi-agent vulnerability scanner that automatically finds security issues
in GitHub repositories and opens fix PRs for human review.

Built on **LangGraph + Node.js + React**.
Based on the CodeAgent paper (EMNLP 2024).
**Zero axios** — all HTTP via native fetch.

---

## How it works

```
Your repo
  ↓
[Scanner agent]        — reads every source file, finds raw vulnerabilities
  ↓
[QA-Checker]           — filters false positives (pass 1 of 2)
  ↓
[Fix agent]            — writes minimal code patches for each confirmed finding
  ↓
[Syntax validator]     — runs real AST parser (node/python3) on every fix
  ↓
[PR creator]           — creates branch, applies patches, opens GitHub PR
  ↓
Human reviews & merges — IntelliCodeRev never auto-merges
```

---

## Project structure

```
intelliCodeRev/
├── backend/        Express API — auth, repos, reviews, webhook
├── frontend/       React dashboard — no axios, pure fetch
├── agents/         LangGraph worker — 5 nodes, 3 tools
├── shared/         Shared types
├── .env.example    All env vars documented
└── docker-compose.yml
```

---

## Quick start

### 1. Clone and install
```bash
git clone <repo>
cd intelliCodeRev
cp .env.example .env      # fill in your keys (see below)
npm install
```

### 2. Set up free services

| Service | What for | Link |
|---------|----------|------|
| Supabase | PostgreSQL database | supabase.com |
| Upstash | Redis (job queue) | upstash.com |
| Groq | Free LLM API | console.groq.com |
| GitHub App | OAuth + webhooks | github.com/settings/apps |

### 3. Supabase schema
Paste `backend/src/db/schema.sql` into the Supabase SQL editor and run it.

### 4. Minimum .env to start
```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_WEBHOOK_SECRET=...

SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...

UPSTASH_REDIS_URL=...

GROQ_API_KEY=...
LLM_PROVIDER=groq
LLM_MODEL=llama-3.1-70b-versatile

JWT_SECRET=<run: openssl rand -hex 32>
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
```

### 5. Run

**With Docker:**
```bash
docker-compose up
```

**Without Docker (4 terminals):**
```bash
# Terminal 1 — Redis
redis-server

# Terminal 2 — Backend API
npm run dev:backend

# Terminal 3 — Agent worker
npm run dev:agents

# Terminal 4 — Frontend
npm run dev:frontend
```

Open http://localhost:5173

---

## LLM providers

Swap via `LLM_PROVIDER` + `LLM_MODEL` in `.env`:

| Provider | Model | Free tier |
|----------|-------|-----------|
| `groq` | `llama-3.1-70b-versatile` | 6000 req/day ✓ |
| `groq` | `llama-3.1-8b-instant` | 14400 req/day ✓ |
| HuggingFace | `Qwen/Qwen2.5-Coder-7B-Instruct` | Self-hosted ✓ |

---

## Deployment (all free tiers)

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | `npm run build` → deploy |
| Backend | Render | Free 500h/month |
| Agents | Render | Separate service |
| Database | Supabase | 500MB free |
| Redis | Upstash | 10k req/day free |
| LLM demo | HF Spaces | CPU-basic free |

---

## Security note — axios supply chain attack

This project deliberately uses **zero axios**.
All HTTP calls use the native `fetch` API (Node.js 18+ built-in).

On March 31, 2026, axios versions 1.14.1 and 0.30.4 were compromised
in a supply chain attack attributed to North Korean state actors,
deploying a RAT on developer machines via a postinstall hook.

Safe alternatives used in this project:
- Frontend HTTP → native `fetch`
- GitHub API → `@octokit/rest` (official GitHub SDK)
- GitHub OAuth → native `fetch`

---

## Research / evaluation

Run a batch scan across multiple repos for benchmarking:

```bash
# POST to /reviews with multiple repos (future batch endpoint)
# Results saved with trigger='batch' for analysis
```

Compare multi-agent vs single-LLM by checking findings count and
false positive rate across the same repos.

Key metric: **QA-Checker rejection rate** — what % of raw scanner
findings were rejected as false positives before any code was touched.
