# Cosmos Nexus Innovations — Production Next.js 16 Starter Template

A modern, high-performance, enterprise-grade web application boilerplate built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

Designed as a **100% plug-and-play, copy-pasteable boilerplate**: simply edit `.env.example` (or `.env.local`) and all branding, page titles, SEO metadata, contact emails, and Docker configurations update automatically across the entire project.

---

## 🚀 Key Features

- **⚡ Modern Stack**: Next.js 16.3.4 (Turbopack), React 19.2.8, TypeScript 5.9 strict mode.
- **🎨 Tailwind CSS v4**: PostCSS integration (`@tailwindcss/postcss`), zero configuration CSS imports, and custom design tokens.
- **🔤 Typography Ready**: Pre-configured with Google Fonts (`Plus Jakarta Sans` as sans-serif and `JetBrains Mono` as monospace) plus local `GeneralSans` font files.
- **🔄 Copy-Paste Portability**: All project details (app name, tagline, description, URLs, contact emails, social links) dynamically resolve from `.env.example` / `.env.local`.
- **🧪 Continuous Testing**: Automated unit tests with Vitest 5.0 (`pnpm test`) with path alias (`@/*`) support.
- **🛡️ Pre-Commit Security & Quality Gate**: Built-in Git hook (`.githooks/pre-commit`) that prevents accidental leaks of `.env` files and runs typechecks, linting, and tests before every commit.
- **🐳 Multi-Stage Docker**: Production-ready Alpine containerization (`Dockerfile` & `docker-compose.yml`) with Next.js standalone output, non-root user hardening, and an automated health probe (`/api/health`).
- **⚙️ Multi-Core Clustering**: Node.js cluster supervisor (`cluster.js`) to scale worker processes across CPU cores in containerized deployments.
- **🚀 Automated CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci-cd.yml`) with automated linting, typechecking, testing, Docker image building, and automated SSH deployment.
- **🪄 One-Command Setup**: Automated bootstrap wizards for macOS/Linux (`./setup.sh`) and Windows (`./setup.ps1`).

---

## 📋 Prerequisites

- **Node.js**: `>= 20.0.0` (LTS v22 or v26 recommended)
- **Package Manager**: **pnpm** `>= 11.25.0` (`corepack enable && corepack prepare pnpm@11.25.0 --activate`)
- **Docker** *(optional for containerization)*: Docker Engine `>= 24.0` and Docker Compose `>= 2.20`

---

## ⚡ Quick Start

### 1. Automated Setup (Recommended)

Run the bootstrap wizard:

**macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup.ps1
```

The script automatically:
1. Validates Node.js and pnpm versions.
2. Initializes `.env.local` from `.env.example`.
3. Installs dependencies using pnpm.
4. Registers Git pre-commit hooks (`.githooks/pre-commit`).
5. Executes typechecks, linter, and unit tests to ensure a clean build.

### 2. Manual Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Activate Git pre-commit hooks
git config core.hooksPath .githooks

# 3. Initialize environment variables
cp .env.example .env.local

# 4. Start local development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Configuration

You only need to edit **`.env.example`** or **`.env.local`**. The entire application, SEO schemas, and Docker containers will automatically adapt.

| Variable | Description | Example / Default |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | Project / Company Name | `"Cosmos Nexus Innovations"` |
| `NEXT_PUBLIC_APP_TAGLINE` | Short brand slogan / subtitle | `"Next-Generation Digital Systems"` |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Meta description & summary | `"Architecting mission-critical digital systems..."` |
| `NEXT_PUBLIC_APP_URL` | Canonical application URL | `"http://localhost:3000"` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | General inquiry email | `"contact@cosmosnexusinnovations.com"` |
| `NEXT_PUBLIC_CAREERS_EMAIL` | Recruitment email | `"careers@cosmosnexusinnovations.com"` |
| `NEXT_PUBLIC_SECURITY_EMAIL` | Vulnerability disclosure email | `"security@cosmosnexusinnovations.com"` |
| `NEXT_PUBLIC_GITHUB_URL` | Organization GitHub link | `"https://github.com/PATELPRATHAM007"` |
| `NEXT_PUBLIC_TWITTER_URL` | X / Twitter profile URL | `"https://x.com"` |
| `NEXT_PUBLIC_LINKEDIN_URL` | LinkedIn company profile | `"https://linkedin.com"` |
| `NEXT_PUBLIC_DISCORD_URL` | Discord community invite | `"https://discord.com"` |
| `NEXT_PUBLIC_API_URL` | Backend REST / GraphQL API | `"http://localhost:8000/api/v1"` |
| `PORT` | Local and production port | `3000` |

---

## 📁 Project Structure

```text
├── .github/
│   └── workflows/
│       └── ci-cd.yml             # Automated CI/CD pipeline (Test -> Docker Build -> Deploy)
├── .githooks/
│   └── pre-commit                # Pre-commit hook (security gate + typecheck + lint + test)
├── public/
│   ├── favicon.ico               # Browser favicon
│   ├── fonts/                    # Local typography assets (GeneralSans)
│   └── *.svg                     # Base static SVG assets
├── src/
│   ├── app/
│   │   ├── api/health/route.ts   # Operational JSON health check probe
│   │   ├── globals.css           # Tailwind CSS v4 & theme font definitions
│   │   ├── layout.tsx            # Root layout with fonts, metadata, and viewport
│   │   ├── page.tsx              # Clean, unopinionated starter landing page
│   │   ├── not-found.tsx         # Standard 404 handler
│   │   ├── error.tsx             # Standard error boundary with recovery action
│   │   └── loading.tsx           # Standard streaming loading state
│   ├── constants/
│   │   ├── assets.ts             # Asset paths
│   │   ├── brand.ts              # Extended brand & palette definitions
│   │   ├── colors.ts             # Core color schema
│   │   ├── spacing.ts            # Spacing tokens
│   │   └── typography.ts         # Font family stacks
│   ├── data/
│   │   └── site-config.ts        # Dynamic site configuration bound to environment
│   ├── lib/
│   │   ├── seo.ts                # Schema.org JSON-LD generators (Org, Breadcrumb, Product)
│   │   └── utils.ts              # Class merger utility (clsx + tailwind-merge)
│   └── types/
│       ├── blog.ts               # Blog post TypeScript definitions
│       ├── career.ts             # Job listings TypeScript definitions
│       ├── case-study.ts         # Case study TypeScript definitions
│       ├── product.ts            # Product showcase TypeScript definitions
│       ├── site.ts               # Site metadata & navigation interfaces
│       └── solution.ts           # Solution category & methodology interfaces
├── tests/
│   └── unit/
│       ├── config.test.ts        # Site configuration & environment tests
│       └── seo.test.ts           # SEO structured data tests
├── Dockerfile                    # 3-stage Alpine container (deps -> builder -> runner)
├── docker-compose.yml            # Container orchestration with health check probe
├── cluster.js                    # High-throughput multi-core Node.js cluster supervisor
├── next.config.ts                # Next.js 16 standalone configuration
├── package.json                  # Scripts & dependencies
├── pnpm-workspace.yaml           # pnpm 11 approved build scripts configuration
├── postcss.config.mjs            # PostCSS plugin for Tailwind CSS v4
├── setup.sh                      # POSIX automated setup wizard
├── setup.ps1                     # PowerShell automated setup wizard
├── tsconfig.json                 # Strict TypeScript configuration with @/* alias
└── vitest.config.mts             # Vitest test runner configuration
```

---

## 🛠️ Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts Next.js development server with Turbopack on `http://localhost:3000` |
| `pnpm build` | Builds optimized standalone production bundle |
| `pnpm start` | Starts compiled standalone production server |
| `pnpm lint` | Runs ESLint 9 checks across all source files |
| `pnpm typecheck` | Runs strict TypeScript compiler checks (`tsc --noEmit`) |
| `pnpm test` | Runs automated Vitest test suite |
| `pnpm test:watch` | Runs Vitest in interactive watch mode |

---

## 🐳 Docker Deployment

The application includes an optimized multi-stage `Dockerfile` and `docker-compose.yml` that directly load environment variables from `.env.example` (or `.env.local` if present). **No `.env` file is required.**

### Launch with Docker Compose:

```bash
# Build and run the container in the background
docker compose up --build -d

# Check service logs
docker compose logs -f

# Verify container health
curl -s http://localhost:3000/api/health
```

### Stop the Container:

```bash
docker compose down
```

---

## 🔒 Security & Git Pre-Commit Hook

This repository includes a pre-commit hook in `.githooks/pre-commit`.

Whenever you run `git commit`, the hook automatically:
1. **Scans staged files** to prevent committing `.env` or `.env.local` files containing secrets.
2. **Runs TypeScript compiler** (`pnpm typecheck`) to block syntax and type errors.
3. **Runs Linter** (`pnpm lint`) to enforce coding standards.
4. **Runs Test Suite** (`pnpm test`) to prevent regression errors.

If any check fails, the commit is safely blocked.

---

## 🚢 CI/CD Workflow

The GitHub Actions workflow at `.github/workflows/ci-cd.yml` automates the release pipeline in three stages:

1. **Continuous Integration Gate**: Runs on every pull request and push to `main`:
   - Checks code formatting and ESLint rules.
   - Compiles TypeScript with strict typechecks.
   - Runs Vitest test suites.
   - Builds Next.js production bundle with Turbopack.
2. **Docker Container Verification**:
   - Builds the production Docker image in CI to ensure zero container regressions.
3. **Continuous Deployment**:
   - Deploys via SSH to your production server on `main` branch push if the following secrets are configured in GitHub Repository Settings:
     - `PROD_HOST`: Server IP or hostname
     - `PROD_SSH_KEY`: Private SSH deployment key
     - `PROD_USERNAME`: Remote SSH user (default: `root`)
     - `PROD_PORT`: Remote SSH port (default: `22`)
     - `PROD_DEPLOY_PATH`: Target directory path on server (default: `/var/www/cosmosnexusinnovations-frontend`)

---

## 📄 License

Proprietary enterprise software — All rights reserved.
