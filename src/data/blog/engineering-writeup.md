---
title: TheWeb3.0 architecture and engineering trade-offs
author: Armin Mohebbipour
pubDatetime: 2026-03-11T12:00:00Z
slug: theweb3-architecture-writeup
featured: false
draft: false
tags:
  - architecture
  - edtech
  - ai
  - sveltekit
  - firebase
description: A full engineering write-up of TheWeb3.0 stack, including frontend architecture, server/runtime design, AI systems, and the core trade-offs behind each technology choice.
---

TheWeb3.0 is not a single "app stack." It is a multi-runtime education platform that combines:

- a SvelteKit web app for product UX
- Firebase for identity, data, and event-driven backend workflows
- a Python AI service for generation, retrieval, grading, and multimodal pipelines

The architecture intentionally separates user-facing interaction loops from heavy AI execution paths. That separation adds complexity, but it also creates cleaner scaling boundaries and better operational control for an AI-heavy product.

This write-up explains the exact libraries used (from `package.json`, `functions/package.json`, and `ai/requirements.txt`), why they were chosen, and what trade-offs they introduce.

## Table of contents

- Product architecture at a glance
- Exact technology inventory by layer
- Frontend engineering decisions (with libraries)
- Backend and data architecture (with libraries)
- AI system architecture (with libraries)
- Reliability, security, and observability signals
- Engineering trade-offs and why they are justified
- Hiring manager version (impact-focused)
- Senior engineer version (deep technical)
- Portfolio takeaway

## Product architecture at a glance

At a high level, TheWeb3.0 uses a "best tool per workload" model:

- **Web app and API edge:** SvelteKit + Vite on Vercel (`@sveltejs/kit`, `@sveltejs/adapter-vercel`, `vite`) with Node `22.x`
- **Core backend/event plane:** Firebase Auth/Firestore/Storage + Functions v2 (`firebase`, `firebase-admin`, `firebase-functions`, `@google-cloud/pubsub`)
- **AI execution plane:** Python Flask service (`flask`, `gunicorn`, `uvicorn`) with LangChain/LangGraph (`langchain`, `langgraph`) and vector retrieval (`pinecone`, `langchain-pinecone`)

This gives the product three operational planes:

1. **Interactive plane:** low-latency UI + API responses
2. **Event plane:** async triggers and worker fan-out
3. **Intelligence plane:** model orchestration, retrieval, OCR, grading, and content generation

The core engineering choice is explicit: avoid overloading one runtime with all concerns.

## Exact technology inventory by layer

### Frontend and product surface (`package.json`)

**Core application framework**

- `svelte@5` + `@sveltejs/kit@2` + `vite@6`
- `@sveltejs/adapter-vercel` for deployment target alignment

**UI, styling, and interaction**

- `tailwindcss` + `daisyui` + `@tailwindcss/typography` + `@tailwindcss/line-clamp`
- `@iconify/svelte` for icon coverage
- `driver.js` for product tours/onboarding UX

**Rich authoring and educational content**

- TipTap stack: `@tiptap/core`, `@tiptap/starter-kit`, `@tiptap/extension-*`, `@tiptap/markdown`, `svelte-tiptap`
- Math + markdown: `katex`, `mathlive`, `markdown-it`, `marked`, `@mdit/plugin-katex`
- Diagrams and plotting: `mermaid`, `chart.js`, `function-plot`, `jsxgraph`

**Specialized interactive tools**

- Whiteboard + diagram tooling: `@excalidraw/excalidraw`, `@excalidraw/mermaid-to-excalidraw`
- PDF workflows: `@embedpdf/*` suite and `@pdftron/pdfjs-express-viewer`
- Pan/zoom and gesture support: `@panzoom/panzoom`, `svg-pan-zoom`, `svelte-pan-zoom`, `svelte-gestures`

**Platform SDKs and integrations**

- Firebase client/admin/function SDKs: `firebase`, `firebase-admin`, `firebase-functions`
- Google APIs: `googleapis`
- Communication: `@sendgrid/mail`, `ws`
- Voice and speech surface: `assemblyai`, `@google-cloud/speech`

**Safety, validation, and output tooling**

- Input contracts: `zod`
- Sanitization: `dompurify`, `isomorphic-dompurify`
- Export/media utilities: `html2canvas`, `html-to-image`, `jspdf`

### Backend/event worker layer (`functions/package.json`)

**Runtime and cloud bindings**

- Node `20` runtime for Functions package
- `firebase-functions@6` (v2 triggers), `firebase-admin@13`
- `@google-cloud/pubsub` for async worker fan-out
- `@google-cloud/functions-framework` for HTTP-function compatibility

**Reliability and API tooling**

- `axios` for external request workflows
- `exponential-backoff` for retry behavior
- `dotenv` for configuration hygiene
- `zod` for schema validation on inbound payloads

**AI-provider bridge in functions**

- `openai` dependency used in moderation/auxiliary tasks

### AI runtime (`ai/requirements.txt`)

**Application and serving**

- API layer: `flask`, `flask-cors`, `werkzeug`
- Process/runtime serving: `gunicorn`, `uvicorn`, `uvicorn-worker`, `functions-framework`

**Agent and orchestration stack**

- `langchain`, `langchain-core`, `langchain-community`, `langchain-classic`
- `langgraph`, `langgraph-checkpoint`, `langgraph-prebuilt`, `langgraph-sdk`
- `langsmith` for tracing/observability support

**Model providers and AI services**

- Core model SDKs: `openai`, `langchain-openai`, `langchain-anthropic`, `langchain-google-genai`, `google-genai`, `mistralai`
- Search and augmentation: `tavily-python`, `google-search-results`
- Voice/media services: `assemblyai`, `webrtcvad`, `pydub`, `moviepy`, `yt-dlp`
- Academic integrity path: `copyleaks`

**Retrieval and vector infrastructure**

- `pinecone`, `langchain-pinecone`
- Embedding/token infrastructure: `tiktoken`

**Document and multimodal processing**

- PDFs/images: `pymupdf`, `pdf2image`, `pillow`
- Data processing: `numpy`, `pandas`, `scipy`
- Math and symbolic: `sympy`

**Cloud integrations**

- GCP/Firebase infra SDKs: `firebase-admin`, `google-cloud-firestore`, `google-cloud-storage`, `google-cloud-pubsub`, `google-cloud-secret-manager`

## Frontend engineering decisions (with libraries)

### Why this frontend is strong engineering, not just "UI work"

The frontend stack reflects explicit product constraints: education content is highly visual, interactive, and stateful. The stack is built for that reality, not for a basic CRUD app.

1. **Framework discipline with modern defaults**
   - SvelteKit + Vite + TypeScript keeps performance and DX high.
   - ESLint + Prettier + `svelte-check` create a static quality gate.

2. **Rich authoring system instead of plain text editor**
   - TipTap extensions, KaTeX, Mermaid, JSXGraph, and charting are chosen to represent real teaching material formats.
   - This is a deliberate investment in educational fidelity.

3. **Framework pragmatism over ideology**
   - React is embedded for advanced tools (`@embedpdf/*`, Excalidraw), while the app shell stays Svelte.
   - This avoids spending months re-implementing mature ecosystems.

4. **Safety and data integrity at UI boundary**
   - `zod` and `dompurify`/`isomorphic-dompurify` reduce injection and malformed payload risk.

5. **Operationally realistic browser features**
   - Export pipelines (`jspdf`, `html2canvas`) and pan/zoom tools show attention to student/teacher workflow details, not just core happy paths.

**Trade-off accepted:** bundle complexity and integration overhead are higher, but the resulting capability depth is substantially higher than a typical dashboard app.

## Backend and data architecture (with libraries)

### Why the backend is engineered as a control plane

The backend uses a BFF + event-driven model instead of placing everything directly in the frontend or directly in one monolithic server.

**BFF/API edge (SvelteKit server routes)**

- Handles auth verification and normalized contracts before requests hit AI or third-party services.
- Keeps API keys and service topology hidden from the client.

**Event plane (Firebase Functions + Pub/Sub)**

- `firebase-functions` v2 with Firestore and Pub/Sub triggers for asynchronous workflows.
- `@google-cloud/pubsub` decouples user interaction from heavy processing.
- `exponential-backoff` and retry patterns make failure handling explicit.

**Data and access model**

- Firestore and Storage rules enforce role-aware constraints.
- `firebase-admin` token verification is used server-side to prevent blind trust in client state.

**Engineering signal:** this is a production-style "separation of concerns" implementation, where user latency paths and heavy compute paths are intentionally split.

## AI system architecture (with libraries)

### Why the AI layer is more than prompt wrappers

The Python service is built as an application platform:

- API service layer (`flask`, SSE streaming behavior)
- agent orchestration layer (`langchain`, `langgraph`)
- retrieval layer (`pinecone`, embeddings/token tools)
- provider-specific capability layer (OpenAI/Anthropic/Gemini/Mistral/etc.)
- async worker integration layer (Pub/Sub, internal authenticated routes)

This structure demonstrates mature AI engineering: orchestration, routing, and failure handling matter as much as model calls.

### Provider strategy and specialization

The codebase does not force one provider for every task:

- OpenAI for broad generation and reasoning flows
- Anthropic for selected generation/code-heavy behaviors
- Google GenAI stack where beneficial
- Mistral and other specialist services for OCR/media/search-specific workflows
- Pinecone for retrieval memory and class/document context grounding

**Engineering benefit:** capability-driven routing improves quality and resilience.
**Trade-off:** higher ops cost in SDK maintenance, credential governance, and cross-provider evaluation.

### Multimodal and education-first pipeline choices

Dependencies like `pymupdf`, `pdf2image`, `pillow`, `moviepy`, `webrtcvad`, and `assemblyai` show that the system handles full educational content lifecycles:

- ingest documents/media
- extract/transform content
- generate instructional artifacts
- score and provide feedback
- stream responses in real time

This is a full content intelligence pipeline, not only chatbot interaction.

## Reliability, security, and observability signals

The stack includes concrete engineering hygiene choices that matter for portfolio quality:

- **Validation-first contracts:** `zod` in TS layers and structured validation in Python routes
- **Security posture:** Firebase token verification, role-based rules, CORS handling, sanitized rich content
- **Async resilience:** queue-based workflows with retries (`exponential-backoff`)
- **Usage governance:** model usage accounting and rollup architecture (cost-awareness is built into design)
- **Deterministic local environment:** Firebase emulators, pinned runtime versions, pnpm lock workflow

These are the signals reviewers usually look for to distinguish prototypes from production-capable systems.

## Engineering trade-offs and why they are justified

### 1) Multi-runtime architecture

- **What you gain:** cleaner scaling boundaries and better workload placement.
- **What you pay:** more deployment complexity and cross-service debugging overhead.

### 2) Rich frontend dependency graph

- **What you gain:** differentiated educational UX with real authoring power.
- **What you pay:** bundle size, integration testing, and long-term upgrade discipline.

### 3) Poly-provider AI approach

- **What you gain:** better capability routing and reduced vendor lock-in.
- **What you pay:** API churn management, eval complexity, and secret management overhead.

### 4) Realtime + event-driven + streaming combined

- **What you gain:** responsive UX with scalable async processing.
- **What you pay:** state synchronization complexity across client, Firestore, Functions, and AI workers.

### 5) Runtime version divergence (Node 22 app vs Node 20 functions)

- **What you gain:** compatibility with each platform target and deployment constraints.
- **What you pay:** careful testing across runtimes and package behavior differences.

For this product domain, these are rational trade-offs because they are linked directly to product outcomes, not accidental complexity.

## Hiring manager version (impact-focused)

This section is the portfolio summary I would give to a hiring manager who cares about ownership, business impact, and execution quality.

### What was built

I built TheWeb3.0 as a full-stack education platform that combines:

- real-time classroom collaboration
- AI-assisted content creation (lectures, quizzes, flashcards, grading)
- multimodal workflows (PDF/document ingestion, voice, diagrams, interactive visuals)

### Why this matters from an impact lens

This architecture supports high-value educational workflows end-to-end in one product:

- teachers can create and update richer lesson materials faster
- students receive more interactive and immediate feedback
- platform behavior remains responsive while heavy AI jobs run asynchronously

### Engineering outcomes this demonstrates

1. **End-to-end product ownership**
   - Designed and integrated frontend, backend, and AI runtime as one coherent system.
   - Chose platform boundaries that map to product needs, not just technical preference.

2. **Scalable architecture decisions**
   - Kept user interaction paths fast by separating event-driven and AI-heavy workloads.
   - Used queue-based processing and streaming responses to balance responsiveness with compute-heavy tasks.

3. **Quality and operational maturity**
   - Added validation contracts (`zod`), role-aware access control (Firebase rules), and secure server-side auth verification.
   - Implemented usage governance and rollups for AI cost visibility, which is critical in production AI systems.

4. **Pragmatic technology leadership**
   - Mixed Svelte and React where each gave the highest leverage (`@embedpdf/*`, Excalidraw) instead of forcing one framework everywhere.
   - Chose a poly-provider AI strategy to optimize capability, resilience, and vendor risk.

### Portfolio positioning statement (for resume/interviews)

Designed and implemented a multi-runtime AI education platform using SvelteKit/Vercel, Firebase Functions/PubSub, and a Python LangGraph AI service. Delivered real-time and async workflows for generation, grading, retrieval, and multimodal content processing with production-oriented security, validation, and cost-governance patterns.

## Senior engineer version (deep technical)

This section is optimized for senior interviews where architectural depth, trade-off reasoning, and failure-mode handling matter.

### 1) System decomposition and boundaries

The system is intentionally split into three runtime planes:

- **Edge/UI plane:** SvelteKit API routes and product UI (Node 22)
- **Event plane:** Firebase Functions v2 + Pub/Sub orchestration (Node 20)
- **AI plane:** Flask service for streaming and heavy educational processing (Python)

Why this decomposition is strong:

- interactive latency is isolated from long-running AI tasks
- each runtime can scale and fail independently
- responsibilities are explicit: API contract enforcement vs orchestration vs intelligence execution

### 2) Request and event flow design

**Interactive path**

- Client requests pass through SvelteKit BFF routes for auth and contract normalization.
- AI chat uses SSE streaming from the AI backend to avoid polling overhead and to improve user-perceived latency.

**Async path**

- Firestore/HTTP events trigger Functions.
- Functions publish/consume Pub/Sub messages and forward heavy tasks to authenticated internal Python endpoints.
- AI worker updates system-of-record documents on completion/failure.

Why this matters:

- avoids timeout pressure on UX paths
- enables retries and compensation logic
- supports eventual consistency with explicit status fields

### 3) Contract and validation model

The stack applies schema and auth checks at multiple boundaries:

- UI/API input validation via `zod`
- server-side Firebase token verification via `firebase-admin`
- route-level role checks and datastore-level rule enforcement

This is layered security and correctness by design, not by accident.

### 4) AI orchestration architecture

The AI runtime is structured around orchestration primitives rather than raw prompt calls:

- `langchain` for model/tool abstraction
- `langgraph` for stateful, multi-step execution
- checkpointing and contextual retrieval for continuity
- provider adapters (`langchain-openai`, `langchain-anthropic`, `langchain-google-genai`)

Engineering rationale:

- educational flows are stateful and tool-rich
- long-running jobs require resumability and recoverability
- provider abstraction supports capability routing and failover flexibility

### 5) Retrieval and multimodal processing

Retrieval and content handling are first-class components:

- vector memory via `pinecone` + `langchain-pinecone`
- token/embedding awareness via `tiktoken`
- document ingestion (`pymupdf`, `pdf2image`, `pillow`)
- audio/video pipeline support (`assemblyai`, `webrtcvad`, `pydub`, `moviepy`, `yt-dlp`)

Why this is non-trivial:

- multimodal pipelines are operationally more complex than text-only chat
- content preprocessing quality directly impacts downstream model quality
- data lifecycle and storage constraints become core architecture concerns

### 6) Reliability and failure-mode strategy

Key resilience signals in this design:

- retry/backoff patterns (`exponential-backoff`) for transient upstream failures
- queue-mediated heavy execution to avoid synchronous cascade failures
- explicit status updates in persisted documents for UI/state recovery
- decoupled runtimes limit blast radius during outages or deploy regressions

Senior-level trade-off discussion:

- increased distributed-system complexity is accepted to improve reliability, user responsiveness, and evolvability

### 7) Operational and platform considerations

Notable operational choices:

- frontend runtime on Node 22 while Functions use Node 20 (platform-compatibility choice)
- pinned dependencies and pnpm lock discipline for reproducibility
- emulator-driven local development for Auth/Firestore/Functions workflows
- multi-provider secret/config management across runtimes

What I would discuss in interview as next hardening steps:

- unify tracing IDs across edge/functions/AI for cross-runtime observability
- formalize SLOs for streaming latency and async job completion
- expand automated contract tests for inter-service payload compatibility
- continue tightening permissive data/storage rule segments as product matures

## Portfolio takeaway

What this project shows as engineering work:

- **Architecture maturity:** explicit separation between interaction, orchestration, and intelligence planes.
- **Technology judgment:** choosing specialized libraries where they provide leverage, not because they are trendy.
- **Production realism:** validation, auth, rules, retries, observability, and cost governance are built into the system design.
- **Execution depth:** this is a cross-stack system that handles real educational workloads end-to-end.

The strongest portfolio message is this: TheWeb3.0 is engineered as a platform with deliberate technical choices, measurable trade-offs, and an architecture that scales with both product complexity and AI workload complexity.
