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

TheWeb3.0 is not something I could comfortably describe as a single app. It ended up becoming a multi-runtime education platform with three very different parts:

- a SvelteKit app for the product itself
- Firebase for auth, data, storage, and event-driven backend work
- a Python AI service for generation, retrieval, grading, and heavier multimodal processing

I split it up that way because I did not want the same runtime handling UI traffic, background jobs, and long-running AI work at the same time. That decision definitely added complexity, but it made the system easier to reason about as the product grew.

This write-up is my attempt to document the stack honestly: what I used, why I used it, and what got better or more difficult because of those choices.

## Table of contents

- Product architecture at a glance
- Exact technology inventory by layer
- Frontend engineering decisions (with libraries)
- Backend and data architecture (with libraries)
- AI system architecture (with libraries)
- Reliability, security, and observability signals
- Trade-offs I accepted
- What I built, in plain terms
- What I would improve next
- Closing thoughts

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

### Why I built the frontend this way

Most of the product surface is visual, interactive, and stateful. I was not building a basic dashboard, so I needed a frontend that could handle rich educational content without becoming painful to maintain.

SvelteKit, Vite, and TypeScript gave me a fast default setup without a lot of ceremony. On top of that, ESLint, Prettier, and `svelte-check` gave me a baseline quality gate so the project would not drift as it got larger.

One of the bigger choices was investing in the authoring experience. I used TipTap, KaTeX, Mermaid, JSXGraph, and charting libraries because lesson content is not just paragraphs of text. Teachers need diagrams, math, structured notes, and interactive material, so I treated that as a real product requirement instead of a nice-to-have.

I also tried to stay pragmatic about frameworks. The main app stays in Svelte, but I pulled in React-based tooling where it clearly saved time, especially for things like PDF workflows and Excalidraw. I would rather deal with some integration overhead than spend months rebuilding mature tools just to keep the stack ideologically pure.

At the UI boundary, I leaned on `zod` and `dompurify` to avoid trusting browser input too much. I also added export and interaction tooling like `jspdf`, `html2canvas`, and pan/zoom libraries because those details matter in a teaching product. They are not flashy architecture decisions, but they affect whether the platform is actually usable.

The downside is obvious: the dependency graph is heavier, and keeping these integrations healthy takes work. I still think it was the right trade, because the product needed capability depth more than it needed the smallest possible bundle.

## Backend and data architecture (with libraries)

### Why I treated the backend as a control plane

I did not want the frontend talking directly to every AI service or background workflow. The backend gradually became a control plane: one place to normalize requests, verify auth, route work, and keep the client insulated from internal service details.

On the edge side, SvelteKit server routes act as a BFF. They verify auth, shape request payloads, and keep credentials and internal topology off the client. That let me keep the browser simpler and more predictable.

For asynchronous work, I leaned on Firebase Functions v2, Firestore triggers, and Pub/Sub. That was important because some of the platform behavior is interactive and some of it is slow by nature. Queueing and fan-out meant I did not have to force long-running work into the same path as user-facing requests. I also used retry and backoff patterns so transient failures were handled intentionally instead of through wishful thinking.

The data model follows the same idea. Firestore and Storage rules handle role-aware constraints, while `firebase-admin` verifies tokens on the server so I am not blindly trusting whatever the client claims.

What I like about this setup is that it gave me clear boundaries. What I do not like is that distributed systems are simply harder to debug. Once you split interaction, orchestration, and persistence across multiple services, you get better workload placement, but you also sign up for more operational work.

## AI system architecture (with libraries)

### Why I separated the AI layer into its own runtime

The Python service grew into its own application instead of staying a thin prompt wrapper. That happened because the hard part was never just calling a model. The hard part was coordinating streaming responses, retrieval, multi-step execution, checkpoints, and longer-running jobs without turning the rest of the app into a mess.

The runtime now has a few distinct layers:

- an API layer built around `flask` and SSE streaming
- orchestration built with `langchain` and `langgraph`
- retrieval and token tooling around Pinecone and embedding utilities
- provider integrations for different model vendors
- background integration points for Pub/Sub-driven work

I did not force one model provider to do everything. Some tasks fit OpenAI better, some worked better with Anthropic or Google, and some specialist workflows needed their own tooling. That flexibility helped, but it also increased the cost of maintenance. Supporting multiple providers means more SDK churn, more credential management, and more evaluation work when behavior changes.

The other big reason this runtime exists is that the product is multimodal. I needed to deal with PDFs, images, audio, diagrams, grading flows, and generated educational content, not just chat. Tools like `pymupdf`, `pdf2image`, `pillow`, `moviepy`, `webrtcvad`, and `assemblyai` came from those needs. Once you start processing that much content, preprocessing quality and storage decisions become part of the architecture, not implementation details.

## Reliability, security, and observability signals

A lot of the less glamorous work in this project sits here. I used `zod` to validate contracts in the TypeScript layers, added structured validation in Python routes, verified Firebase tokens server-side, relied on role-aware rules in Firestore and Storage, and kept rich content sanitized. None of that is especially exciting to demo, but it is the kind of work that keeps a product from feeling fragile.

I also cared a lot about resilience. Pub/Sub-based workflows, retries with `exponential-backoff`, explicit status fields, and local emulator support all came from trying to make failures visible and recoverable. On the AI side, I tracked usage because cost control is part of the system design whether you want it to be or not.

## Trade-offs I accepted

This project got better because of a few choices, and harder because of the same choices.

The multi-runtime split gave me cleaner scaling boundaries, but it also made deployments and debugging more involved. The richer frontend made the product more capable, but it increased bundle pressure and long-term upgrade work. The multi-provider AI strategy gave me more flexibility, but it also meant more SDK churn and more secrets to manage. Combining realtime UI, background jobs, and streaming responses made the product feel responsive, but it introduced state synchronization problems across the client, Firestore, Functions, and the AI workers.

I also had to live with runtime differences. The main app runs on Node 22 while Functions run on Node 20, which was mostly a platform compatibility decision. It works, but it means I need to be more deliberate about testing and dependency behavior.

## What I built, in plain terms

At the product level, I built TheWeb3.0 to support real classroom workflows. That includes collaboration features, AI-assisted content creation, grading, and more interactive learning materials. The reason the architecture ended up this involved is simple: those workflows pull in very different kinds of work, and I did not want to fake that by pretending everything could live comfortably in one process.

What I am most happy with is that the boundaries map to the product fairly well. User-facing paths stay responsive, heavy jobs can run asynchronously, and the AI layer has enough room to handle stateful and multimodal workflows without contaminating everything else.

## What I would improve next

If I kept hardening this system, I would start with better cross-runtime observability. Shared tracing IDs across the app, Functions, and AI service would make debugging much easier. I would also tighten contract testing between services, define clearer latency and job-completion targets, and continue narrowing any permissive data or storage rules that were acceptable earlier in development but would not be good enough later on.

## Closing thoughts

This project taught me a lot about where complexity is actually worth paying for. Some of the structure here is expensive, but it is tied to real product needs: interactive education workflows, asynchronous processing, multimodal inputs, and AI-heavy features that do not behave like standard web CRUD.

More than anything, TheWeb3.0 reflects how I like to build systems now. I would rather make the boundaries explicit, accept the trade-offs, and document them clearly than pretend a simpler architecture would have handled the same workload just as well.
