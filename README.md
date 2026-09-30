# IntelliCodeRev — AI Security Scanner

An AI-powered multi-agent security scanner that automatically finds vulnerabilities in GitHub repositories and opens fix PRs for human review.

Built with **Node.js · React · LangGraph · PostgreSQL · Redis**

---

## What it does

```
Your GitHub repo
  ↓
[Scanner agent]      — reads source files, finds vulnerabilities
  ↓
[QA-Checker]         — filters out false positives
  ↓
[Fix agent]          — writes code patches for confirmed issues
  ↓
[Syntax validator]   — verifies every patch with a real AST parser
  ↓
[PR creator]         — opens a GitHub PR with the fixes
  ↓
You review & merge   — IntelliCodeRev never auto-merges
```

---

## Prerequisites

Make sure you have these installed on your machine:

- [Node.js](https://nodejs.org/) v18 or higher
- [Git](https://git-scm.com/)
- npm (comes with Node.js)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/aruneshwars639/IntelliCodeRev.git
cd IntelliCodeRev
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the required free services

You need accounts on these platforms (all free):

| Service | Purpose | Sign up |
|---------|---------|---------|
| [Neon](https://neon.tech) | PostgreSQL database | neon.tech |
| [Upstash](https://upstash.com) | Redis job queue | upstash.com |
| [Groq](https://console.groq.com) | Free LLM API | console.groq.com |
| [GitHub OAuth App](https://github.com/settings/developers) | Login + webhooks | github.com/settings/developers |

#### Setting up GitHub OAuth App
1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set **Homepage URL** to `http://localhost:5173`
3. Set **Authorization callback URL** to `http://localhost:3001/auth/callback`
4. Copy the **Client ID** and generate a **Client Secret**

#### Setting up Neon (Database)
1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **Connection String** (looks like `postgresql://user:pass@...neon.tech/neondb?sslmode=require`)
3. Go to the **SQL Editor** in Neon and paste + run the contents of `backend/src/db/schema.sql`

#### Setting up Upstash (Redis)
1. Create a database at [upstash.com](https://upstash.com)
2. Copy the **Redis URL** (starts with `rediss://`)

#### Setting up Groq (LLM)
1. Sign up at [console.groq.com](https://console.groq.com)
2. Go to **API Keys** and create a new key

---

### 4. Configure your environment variables

Copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# Database (from Neon)
DATABASE_URL=postgresql://user:pass@your-host.neon.tech/neondb?sslmode=require

# Redis (from Upstash)
UPSTASH_REDIS_URL=rediss://default:yourpassword@your-host.upstash.io:6379

# LLM (from Groq)
GROQ_API_KEY=your_groq_api_key
LLM_PROVIDER=groq
LLM_MODEL=llama-3.1-70b-versatile

# GitHub OAuth App
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_WEBHOOK_SECRET=any_random_string

# JWT — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_generated_secret
JWT_EXPIRES_IN=7d

# App URLs (keep as-is for local dev)
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
```

---

### 5. Run the project

You need **3 terminal windows** running at the same time:

**Terminal 1 — Backend API**
```bash
npm run dev:backend
```

**Terminal 2 — Agent worker**
```bash
npm run dev:agents
```

**Terminal 3 — Frontend**
```bash
npm run dev:frontend
```

Then open **http://localhost:5173** in your browser.

---

## Project Structure

```
IntelliCodeRev/
├── backend/          Express API — auth, repos, reviews, webhooks
├── frontend/         React dashboard
├── agents/           LangGraph multi-agent worker
├── shared/           Shared types
├── .env.example      All environment variables with descriptions
└── docker-compose.yml
```

---

## Running with Docker (alternative)

If you have [Docker](https://www.docker.com/) installed, you can run everything with one command:

```bash
docker-compose up
```

---

## Switching LLM Providers

Change `LLM_PROVIDER` and `LLM_MODEL` in your `.env`:

| Provider | Model | Free tier |
|----------|-------|-----------|
| `groq` | `llama-3.1-70b-versatile` | 6,000 req/day |
| `groq` | `llama-3.1-8b-instant` | 14,400 req/day |

---

## Deployment (all free tiers)

| Part | Platform | Notes |
|------|----------|-------|
| Frontend | [Vercel](https://vercel.com) | Connect GitHub repo, auto-deploys |
| Backend | [Render](https://render.com) | Free 500h/month |
| Agents | [Render](https://render.com) | Deploy as separate service |
| Database | [Neon](https://neon.tech) | 500MB free |
| Redis | [Upstash](https://upstash.com) | 10k req/day free |

---

## Common Issues

**`Database connection failed` on startup**
- Make sure your `DATABASE_URL` is correct in `.env`
- For local Postgres, add `DB_SSL=false` to your `.env`

**`Invalid token` errors**
- Make sure `JWT_SECRET` is set and is at least 32 characters long

**GitHub login not working**
- Double-check the OAuth callback URL matches exactly: `http://localhost:3001/auth/callback`