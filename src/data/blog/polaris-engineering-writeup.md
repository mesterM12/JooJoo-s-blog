---
title: Polaris engineering write-up
author: Armin Mohebbipour
pubDatetime: 2026-03-11T12:00:00Z
slug: polaris-engineering-writeup
featured: false
draft: false
tags:
  - architecture
  - cybersecurity
  - ai
  - bun
  - microservices
description: A complete engineering write-up of Polaris, including system architecture, technology decisions, cross-service trade-offs, and runtime design rationale.
---
# Polaris Engineering Write-Up: Technology Decisions, Trade-offs, and Architecture Rationale

Polaris is a multi-runtime cybersecurity platform that combines a modern web app, a low-latency command-and-control backend, an AI orchestration service with persistent sub-agents, a dedicated scanning microservice, and a Go endpoint client.

This write-up is intentionally technical and decision-focused. It documents:

- the exact technologies used across the codebase
- why those technologies fit this product
- the trade-offs accepted to get the capabilities Polaris needs

---

## 1) System Architecture at a Glance

Polaris is designed as **specialized services with clear workload boundaries**, not a single monolith:

- `FrontEnd/`: React + Vite UI and interaction layer
- `BackEnd/`: Elysia/Bun API for auth, targets, command routing, SSE, WS terminal relay, and build endpoints
- `DeepAgent/`: Elysia/Bun + LangChain/LangGraph agent runtime with persistent sessions and tool orchestration
- `PyScript/`: Flask scanner service for Nmap/Nikto/Wapiti/SQLMap workflows and local display integration
- `PolarisClient/`: Go endpoint implant/client for command polling, command execution, and telemetry
- `schema/`: shared TypeScript contracts for frontend/backend
- `compose.yml` and `compose.debug.yml`: production/dev orchestration with MongoDB, Redis, Caddy, and tooling

### Why this architecture is strong engineering

This decomposition maps to different execution models:

- **UI responsiveness** stays in the frontend + streaming APIs
- **stateful command/control and session routing** stays in backend services
- **long-running AI and tool loops** are isolated in DeepAgent
- **network and vulnerability scanning** is isolated in Python where scanner ecosystem tooling is mature
- **host-level endpoint operations** live in Go for native process/system integration

The trade-off is higher operational complexity (more containers, more interfaces, more auth boundaries), but it yields clearer scalability and fault isolation.

---

## 2) Technology Inventory (Exact Libraries and Platforms)

## Frontend (`FrontEnd/package.json`)

### Core platform

- `react` + `react-dom` (v19)
- `vite` + `@vitejs/plugin-react`
- `typescript`
- `react-router-dom`

### Styling and component system

- `tailwindcss` + `@tailwindcss/vite` (Tailwind v4 setup)
- `tailwind-merge`, `clsx`, `class-variance-authority`
- `@radix-ui/*` primitives
- `lucide-react` icons

### Rich content and rendering

- `react-markdown` + `remark-gfm`
- `react-syntax-highlighter` + `prismjs`
- `mermaid`

### Agent UX and terminal interaction

- `xterm`, `xterm-addon-fit`, `xterm-addon-web-links`

### Editor stacks (present for rich authoring surfaces)

- `lexical` + `@lexical/*`
- `@mdxeditor/editor`
- `@toast-ui/editor`, `@toast-ui/react-editor`

### PWA and build tooling

- `vite-plugin-pwa`
- ESLint stack: `eslint`, `typescript-eslint`, `@eslint/js`, React hooks/refresh plugins

### Why this stack is appropriate

Polaris frontend is not just dashboard CRUD. It handles:

- streaming AI output
- tool execution timelines
- terminal surfaces
- markdown/code/diagram rendering

React + Vite + TS is a pragmatic, high-iteration stack with strong ecosystem support for these UI patterns. Tailwind + Radix accelerates accessible UI construction while keeping design control.

### Trade-offs

- Larger dependency surface and version-management burden
- Potential bundle growth from rich editor/render libraries
- More integration testing required (markdown, mermaid, code highlight, terminal widgets)

---

## Backend API (`BackEnd/package.json`)

### Core runtime and framework

- `bun` runtime
- `elysia`
- `@elysiajs/cors`

### Security/auth/data

- `jsonwebtoken` + `@types/jsonwebtoken`
- `bcryptjs` + `@types/bcryptjs`
- `mongodb`
- `ioredis`
- `@sinclair/typebox` (schema typing for some request contracts)

### Why this stack is appropriate

Elysia + Bun is chosen for low-overhead TypeScript APIs and fast startup/runtime characteristics. This backend handles:

- cookie/JWT auth flows
- authorization checks per target owner
- command relay and response ingestion
- SSE event streaming
- WebSocket-based terminal multiplexing
- per-user target data and message persistence

### Key engineering patterns in implementation

- **Cookie auth with environment-aware security flags** (`secure` in prod, relaxed in local modes)
- **Ownership validation** before sensitive target operations
- **Redis pub/sub + SSE** for near-real-time command/response updates
- **Durable terminal sessions** persisted to MongoDB and restored on startup
- **WebSocket bridging** between frontend clients and agent terminals with history replay

### Trade-offs

- Combining HTTP + SSE + WS in one service increases codepath complexity
- Session restoration logic (timers/dirty flags/history replay) is powerful but non-trivial
- Requires strict discipline to avoid state-sync bugs across in-memory maps and DB records

---

## DeepAgent (`DeepAgent/package.json`)

### Core stack

- `elysia`
- `deepagents`
- `langchain`
- `@langchain/community`
- `@langchain/openai`
- `@langchain/ollama`
- `@langchain/tavily`
- `@langchain/langgraph-checkpoint-mongodb`

### Session/tooling and execution

- `playwright`
- `bun-pty`
- `@xterm/headless`

### Data/auth

- `mongodb`
- `jsonwebtoken`

### Why this stack is appropriate

DeepAgent is not a stateless prompt endpoint. It is a **stateful orchestration runtime** with:

- long-lived conversations and checkpoints
- model/tool streaming
- resumable human-in-the-loop interrupts
- persistent terminal/browser sub-agent sessions
- notebook memory and skill retrieval
- token-usage accounting and summarization control

LangGraph checkpointing to MongoDB is a critical decision: it enables continuity across turns and failures. DeepAgent’s custom summarization/token accounting logic indicates an intentional design for long-running, tool-heavy workflows.

### Trade-offs

- Higher cognitive complexity than plain chat completion APIs
- More failure modes around interrupt/resume/session lifecycle
- Requires robust observability and careful migration discipline as model/tool APIs evolve

---

## Scanner Service (`PyScript/requirements.txt` + `PyScript/main.py`)

### Runtime and service framework

- `flask`
- `flask-cors`

### Scanner ecosystem dependencies

- `python-nmap`
- `python-wappalyzer`
- `python-owasp-zap-v2.4`
- `requests`
- `aiohttp` and related async/network libs

### Why this stack is appropriate

The Python scanner service wraps multiple security scanners and runs scans in background threads with progress callbacks persisted to DB. This cleanly separates long-running scan workflows from the Bun backend and AI orchestration runtime.

This service exposes:

- full scan orchestration
- Nikto scans
- Wapiti scans
- SQLMap scans
- scan logs and status/history APIs

It also integrates with a local paper display renderer, which is a hardware-adjacent concern that belongs outside the primary web API.

### Trade-offs

- Additional runtime and deployment surface (Python toolchain + Bun toolchain)
- Background thread management and scanner process handling adds operational risk
- Requires careful API contract consistency between frontend and scanner service

---

## Endpoint Client (`PolarisClient/go.mod`)

### Core dependencies

- `gorilla/websocket` for WS communication
- `gopsutil` for host telemetry
- `creack/pty` and `conpty` for pseudo-terminal support
- `kbinani/screenshot` for host screenshot capture

### Why Go is a good fit

Endpoint clients need efficient binaries, cross-platform support, process/system primitives, and stable network behavior. Go is a strong choice for this role.

Backend build endpoints dynamically inject configuration into client source and compile per target platform, supporting tailored artifact generation.

### Trade-offs

- Cross-compilation pipeline and binary packaging complexity
- Security implications of generating and distributing per-user implants
- Need for strict build hygiene and artifact controls

---

## Infrastructure and Containerization (`compose.yml`, `compose.debug.yml`, Dockerfiles, Caddy)

### Core infra components

- Docker Compose for multi-service orchestration
- `MongoDB` for persistent data
- `Redis` for pub/sub and low-latency signaling
- `Caddy` as reverse proxy
- Optional operations tools: `mongo-express`, `redis-commander`, `portainer`

### Container/runtime details

- Frontend containerized on Node (build/runtime stages)
- Backend containerized on Bun with additional Go toolchain for build endpoint needs
- DeepAgent runs on Kali base with extensive pentest toolchain + Playwright browser setup

### Why this is strong engineering

- Dev and prod compose files clearly separate convenience vs deployment posture
- Caddy config explicitly supports API and DeepAgent reverse proxying with streaming-friendly settings
- DeepAgent container is purpose-built for offensive-security workflows and browser automation

### Trade-offs

- DeepAgent image is intentionally heavy (tool-rich), increasing build/pull time and attack surface
- Multi-service local environments are more complex to bootstrap
- Capability additions like `NET_ADMIN`/`NET_RAW` and root container execution are powerful but high-risk if not tightly controlled

---

## 3) Cross-Cutting Engineering Decisions and Why They Matter

## A) Streaming architecture: SSE + WS used intentionally

- **SSE** is used for AI output and command event listeners (simple, HTTP-friendly, one-way streams).
- **WebSockets** are used for terminal interactions where full duplex is required.

**Why this is correct:** use each protocol where it is strongest instead of forcing one transport for all problems.

**Trade-off:** frontend/backend protocol complexity increases (SSE parsers, reconnection behavior, WS session routing).

## B) Stateful workflows with durability

- Terminal sessions are persisted and restorable.
- DeepAgent checkpoints and conversation state are persisted in MongoDB.
- Notebook entries and token usage are persisted for continuity and observability.

**Why this matters:** this is production-style reliability engineering, not ephemeral demo chat.

**Trade-off:** more state machines and lifecycle handling across memory + DB.

## C) Human-in-the-loop interrupt/resume

- Main-agent interrupt with corrective instructions
- Session-level interrupt for sub-agents
- ask-user flow with pending-request reconciliation

**Why this matters:** practical autonomous systems need operator steering, not one-shot black-box execution.

**Trade-off:** significantly more control-flow complexity compared with simple request/response AI APIs.

## D) Shared contracts in `schema/`

- Shared TypeScript interfaces between frontend/backend reduce contract drift.

**Why this matters:** better DX and fewer integration bugs.

**Trade-off:** contract evolution must be coordinated across services.

---

## 4) Engineering Trade-offs by Design (Portfolio-Ready Framing)

## 1) Multi-runtime system (TypeScript/Bun + Python + Go)

- **Gain:** right language/runtime for each workload domain
- **Cost:** deployment and observability complexity

## 2) Heavy DeepAgent capability set

- **Gain:** sophisticated, persistent, tool-using agent behavior
- **Cost:** higher maintenance and failure-mode surface

## 3) Rich frontend capability stack

- **Gain:** advanced UX for AI orchestration, timelines, notebooking, and terminals
- **Cost:** dependency and UI-state complexity

## 4) Security tooling inside runtime containers

- **Gain:** practical offensive-security workflows from within platform
- **Cost:** privileged container posture must be tightly managed

## 5) Real-time protocols plus durable state

- **Gain:** responsive UX and reliable replay/recovery
- **Cost:** complexity in session synchronization and reconnection edge cases

---

## 5) Why This Demonstrates Strong Engineering

Polaris demonstrates engineering maturity in ways that hiring teams usually care about:

- deliberate service decomposition by workload
- explicit streaming strategy (SSE vs WS)
- durable state and recovery paths
- layered auth/authorization checks and ownership enforcement
- operationally realistic infrastructure setup
- strong use of specialized ecosystems (LangGraph for orchestration, Python scanners, Go endpoint tooling)

This is not just “many technologies in one repo.” It is a cohesive platform where each technology is selected for a specific constraint and integrated into a broader architecture with clear boundaries and trade-offs.

---

## 6) Interview/Portfolio Positioning Statement

Designed and implemented a multi-runtime cybersecurity platform that combines a React/Tailwind frontend, a Bun/Elysia backend, a LangGraph-based DeepAgent service, a Python scanner microservice, and a Go endpoint client. Built streaming-first user workflows (SSE + WebSocket), persistent session and checkpoint state in MongoDB, and Redis-backed event signaling, while intentionally trading operational simplicity for stronger capability depth, reliability, and workload-specialized performance.

