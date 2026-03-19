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

Polaris grew into a multi-runtime cybersecurity platform with a few very different moving parts: a web app, a low-latency backend, an AI orchestration service, a scanner microservice, and a Go endpoint client.

I wrote this post to document how those pieces fit together, why I chose them, and where the architecture got better or more complicated because of those decisions.

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

### Why I split it up this way

This decomposition maps cleanly to different execution models:

- **UI responsiveness** stays in the frontend + streaming APIs
- **stateful command/control and session routing** stays in backend services
- **long-running AI and tool loops** are isolated in DeepAgent
- **network and vulnerability scanning** is isolated in Python where scanner ecosystem tooling is mature
- **host-level endpoint operations** live in Go for native process/system integration

The trade-off is higher operational complexity. More containers means more interfaces, more auth boundaries, and more things that can go wrong. I still preferred that over cramming everything into one service, because the separation made scaling and fault isolation much easier to reason about.

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

### Why this stack fits the frontend

Polaris frontend is not just dashboard CRUD. It handles:

- streaming AI output
- tool execution timelines
- terminal surfaces
- markdown/code/diagram rendering

React + Vite + TypeScript gave me a fast iteration loop and a mature ecosystem for these patterns. Tailwind and Radix let me build out the UI quickly without giving up too much control over accessibility or styling.

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

### Why this stack fits the backend

I chose Elysia on Bun because I wanted a low-overhead TypeScript API with fast startup and solid performance. This backend handles:

- cookie/JWT auth flows
- authorization checks per target owner
- command relay and response ingestion
- SSE event streaming
- WebSocket-based terminal multiplexing
- per-user target data and message persistence

### Patterns I relied on in the backend

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

### Why this stack fits DeepAgent

DeepAgent is not a stateless prompt endpoint. I built it as a **stateful orchestration runtime** with:

- long-lived conversations and checkpoints
- model/tool streaming
- resumable human-in-the-loop interrupts
- persistent terminal/browser sub-agent sessions
- notebook memory and skill retrieval
- token-usage accounting and summarization control

LangGraph checkpointing into MongoDB ended up being one of the most important choices in this part of the system. It made it possible to continue sessions across turns and failures instead of treating every interaction like a fresh request. The custom summarization and token accounting logic came from the same need: long-running, tool-heavy workflows need more structure than normal chat endpoints.

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

### Why this stack fits the scanner service

The Python scanner service wraps multiple security scanners and runs scans in background threads with progress callbacks persisted to the database. I wanted long-running scan workflows to live outside the Bun backend and the AI orchestration runtime so each service could stay focused.

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

### Why I used Go for the endpoint client

For the endpoint client, I wanted efficient binaries, cross-platform support, access to system primitives, and predictable network behavior. Go was a very natural fit for that.

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

### Why this infrastructure setup made sense

- Dev and prod compose files separate convenience from deployment posture
- Caddy is configured to handle API and DeepAgent reverse proxying with streaming-friendly settings
- The DeepAgent container is intentionally built around offensive-security workflows and browser automation

### Trade-offs

- DeepAgent image is intentionally heavy (tool-rich), increasing build/pull time and attack surface
- Multi-service local environments are more complex to bootstrap
- Capability additions like `NET_ADMIN`/`NET_RAW` and root container execution are powerful but high-risk if not tightly controlled

---

## 3) Cross-cutting decisions that shaped the project

## A) Streaming architecture: SSE + WS used intentionally

- **SSE** is used for AI output and command event listeners (simple, HTTP-friendly, one-way streams).
- **WebSockets** are used for terminal interactions where full duplex is required.

I used each protocol where it fit best instead of forcing one transport to handle everything.

**Trade-off:** frontend/backend protocol complexity increases (SSE parsers, reconnection behavior, WS session routing).

## B) Stateful workflows with durability

- Terminal sessions are persisted and restorable.
- DeepAgent checkpoints and conversation state are persisted in MongoDB.
- Notebook entries and token usage are persisted for continuity and observability.

This mattered because I did not want the platform to feel disposable. Persistent sessions and replay paths make a huge difference once users are doing real work in the system.

**Trade-off:** more state machines and lifecycle handling across memory + DB.

## C) Human-in-the-loop interrupt/resume

- Main-agent interrupt with corrective instructions
- Session-level interrupt for sub-agents
- ask-user flow with pending-request reconciliation

This mattered because practical autonomous systems still need operator steering. I did not want a one-shot black box.

**Trade-off:** significantly more control-flow complexity compared with simple request/response AI APIs.

## D) Shared contracts in `schema/`

- Shared TypeScript interfaces between frontend/backend reduce contract drift.

Shared contracts cut down on drift and made the frontend/backend integration less fragile.

**Trade-off:** contract evolution must be coordinated across services.

---

## 4) Trade-offs I accepted

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

## 5) What Polaris taught me

The biggest lesson from Polaris was that the architecture only made sense once I stopped treating every part of the platform as the same kind of workload. The UI, the command-and-control backend, the scanner service, the agent runtime, and the endpoint client each wanted a different execution model, and the project got cleaner once I let that be true.

I also came away with a better sense of where complexity is justified. Durable sessions, interrupt and resume flows, SSE, WebSockets, Redis signaling, and multiple runtimes all add failure modes. But in a platform like this, those details are tied to the actual user experience and operator workflows, not just technical ambition for its own sake.

---

## 6) Closing thoughts

Looking back, Polaris feels like one of those projects where the stack tells the story pretty clearly. I used React and Tailwind where I needed a capable frontend, Bun and Elysia where I wanted a fast control plane, Python where the scanner ecosystem was stronger, and Go where I needed a reliable endpoint client. The result is not simple, but it is honest about the problem space.

If I were continuing the project, most of my next work would be around observability, stricter safety controls, and making the operational side easier to manage. The core architectural choices still feel right to me, though, because they came from the workload itself and not from trying to make the project sound impressive on paper.

