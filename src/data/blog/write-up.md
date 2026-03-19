---
title: artefficient.io architecture and engineering trade-offs
author: Armin Mohebbipour
pubDatetime: 2026-03-11T12:00:00Z
slug: artefficient-architecture-writeup
featured: false
draft: false
tags:
  - architecture
  - nextjs
  - strapi
  - ai
  - portfolio
description: A detailed engineering write-up of artefficient.io, covering the Next.js product app, Strapi CMS platform, AI integrations, deployment topology, and the key trade-offs behind each technology choice.
---

artefficient.io is built as a two-platform product:

- a **Next.js App Router** application for the public product experience, lead capture, careers, and AI assistant interactions
- a **Strapi v5 CMS** service for editorial content (blog + job openings), media, and SEO-managed publishing

This split is intentional. The main app optimizes for speed of product iteration and presentation quality, while CMS operations are isolated in a dedicated service that can evolve independently.

What follows is a full engineering breakdown of the stack, why these tools fit the product, and the trade-offs accepted by the team.

## Table of contents

- Product architecture at a glance
- Frontend platform and runtime choices
- Design system and motion stack
- AI assistant integration approach
- Content architecture with Strapi
- API and data access patterns
- Security, trust, and abuse controls
- Deployment and operations model
- Developer experience and quality posture
- Major trade-offs and future hardening priorities
- What this architecture demonstrates

## Product architecture at a glance

At a high level, the architecture has two production runtimes and a clear boundary between them:

1. **Experience runtime (Next.js on Vercel):**
   - localized marketing/product pages
   - server route handlers under `app/api/*`
   - lead/contact/careers submission endpoints
   - AI chat endpoint for the Tuti assistant

2. **Content runtime (Strapi on Cloud Run):**
   - blog content model with SEO fields and localization
   - job opening model with hiring-specific fields
   - editor/admin workflows in Strapi admin
   - media upload management via Google Cloud Storage

3. **Integration contract between both runtimes:**
   - Next.js fetches CMS content using token-authenticated server calls
   - selected Next API routes proxy/filter Strapi data for frontend consumption
   - locale alignment is maintained between frontend routes and CMS content locales

The key engineering decision is separation of concerns:

- **product UX and conversion logic** stay in the frontend app
- **editorial systems and schema management** stay in the CMS service

This increases operational surface area, but gives cleaner ownership and scaling boundaries.

## Frontend platform and runtime choices

### Why Next.js App Router + TypeScript

The root app uses modern Next.js with React + TypeScript.

This is a strong fit for a product site that needs:

- server-rendered performance and metadata control
- route-level APIs in the same codebase
- granular caching/revalidation behavior
- strong typing across UI and route handlers

**Trade-offs:**

- App Router server/client boundary mistakes are easy to introduce
- mixed rendering modes require careful cache strategy discipline
- runtime behavior can become subtle when pages, route handlers, and CMS fetches interact

### Why `next-intl` for localization

Localization is first-class in the app, with middleware + locale-aware routing (`en`, `fr`).

This choice gives:

- a clean URL model (`/[locale]/...`)
- language-specific metadata and copy delivery
- a predictable localization framework across page and content surfaces

**Trade-offs:**

- middleware complexity increases quickly
- locale fallback logic must be explicit and tested
- translation drift risk grows as pages/content surfaces expand

## Design system and motion stack

### Tailwind-first UI with composable primitives

The UI stack combines:

- Tailwind CSS
- Radix primitives / shadcn-style component setup
- Magic UI patterns
- utility helpers (`clsx`, `class-variance-authority`, `tailwind-merge`)

This is a pragmatic design system strategy for teams that need fast iteration without rebuilding primitives from scratch.

**Why it works here:**

- pages can ship quickly while preserving consistency
- interactive controls remain composable and accessible
- design tokens remain mostly code-native and easy to evolve

**Trade-offs:**

- dependency count and update burden increase
- style ownership can fragment across libraries
- bundle discipline becomes important when visual libraries accumulate

### Motion and storytelling as product differentiation

The product uses Framer Motion and GSAP to create a visually expressive, conversion-focused experience.

That supports brand positioning in two ways:

- communicates product energy and modernity
- makes complex value props more legible through animated sequencing

**Trade-offs:**

- animation-heavy UIs can hurt performance on weaker devices
- debugging timing, re-render, and interaction regressions becomes harder
- motion systems require governance to avoid UX inconsistency

## AI assistant integration approach

### Vercel AI SDK + OpenAI through server route handlers

The chat endpoint (`app/api/chat/route.ts`) uses the AI SDK streaming model with OpenAI, and the frontend chat interface consumes streamed responses.

This architecture is good for:

- low-latency conversational UX on landing/product pages
- keeping provider credentials server-side
- fast implementation with fewer custom protocol layers

**Trade-offs:**

- provider and SDK coupling can reduce portability
- cost/abuse governance becomes an ongoing requirement
- prompt control quality directly affects perceived product reliability

### Prompt strategy and brand voice

The assistant prompt is intentionally constrained to:

- a concise tone
- role-aware messaging (teachers, students, managers)
- explicit refusal boundaries for pricing/technical/legal details

This is a practical product choice: the assistant acts as a guided conversion touchpoint, not a general-purpose chatbot.

**Trade-offs:**

- strict constraints can reduce conversational flexibility
- prompt-only controls are not a complete policy layer
- long-term reliability typically requires additional evaluation tooling

## Content architecture with Strapi

### Why Strapi v5 as a separate CMS service

The CMS (`cms/strapi-project`) is a full Strapi v5 TypeScript app with:

- custom content types for `blog` and `job-opening`
- SEO-focused schema fields
- i18n support configured for `en` and `fr`
- custom controller logic for SEO/sitemap behavior

This gives non-engineering teams direct publishing control while the frontend focuses on presentation and conversion.

### Blog model design: SEO as a first-class concern

The blog schema includes:

- content + localized slug
- media cover
- SEO title/description/keywords
- canonical URL and robots directives
- optional structured data JSON

This is a mature content design because SEO metadata is editable at entry level instead of hardcoded in frontend templates.

**Trade-offs:**

- SEO logic gets distributed across CMS schema, controllers, and frontend metadata generators
- editorial freedom increases risk of inconsistent metadata quality
- validation/sanitization standards must be maintained over time

### Job opening model design: operational hiring workflows

The job model includes:

- role metadata (department, type, location, experience)
- rich text responsibilities/requirements/benefits
- active/featured toggles
- application deadline and structured SEO fields

This enables recruiting teams to manage listings without frontend deployments.

**Trade-offs:**

- schema drift can appear if custom middleware/controllers lag behind content model updates
- API contracts need consistent normalization for frontend consumption

### Media strategy: Google Cloud Storage upload provider

Strapi is configured with the GCS upload provider and CSP rules that explicitly allow the bucket domain.

**Why this is a strong choice:**

- externalizes media from app containers
- aligns naturally with Cloud Run deployment topology
- supports controlled long-term storage and delivery patterns

**Trade-offs:**

- tighter cloud-provider coupling
- IAM and bucket policy management complexity
- signed/public URL strategy must stay consistent across frontend and CMS

## API and data access patterns

### BFF pattern in Next route handlers

Next route handlers are used as a backend-for-frontend (BFF) layer for:

- contact form submissions
- newsletter submissions
- job applications with file attachments
- job listing retrieval from Strapi
- AI chat orchestration

This pattern centralizes provider integrations server-side and keeps secrets out of the browser.

### CMS fetch strategy and cache behavior

`lib/blog-service.ts` uses tagged fetches and revalidation windows for content retrieval, including sitemap and SEO-oriented endpoints.

This improves read performance and controls content freshness without rebuilding on every change.

**Trade-offs:**

- cache invalidation rules become a product concern, not just an infrastructure detail
- endpoint fallback logic adds resilience but can mask structural API issues if not monitored

### Rewrites and runtime decoupling

`next.config.js` rewrites `/strapi-admin/*` and `/strapi-api/*` to the CMS host.

This simplifies local/prod URL ergonomics and allows frontend and CMS to feel cohesive externally while remaining independently deployable.

**Trade-offs:**

- debugging cross-service routing can be less obvious
- environment variable consistency is critical (and currently uneven in some routes)

## Security, trust, and abuse controls

### What is already in place

- security headers in frontend middleware (for non-API page routes)
- reCAPTCHA validation in job application submission flow
- server-side SendGrid usage for outbound form notifications
- token-based CMS API access from server context

### Important current gaps and risks

- not all public submission endpoints have anti-abuse controls
- middleware header protections intentionally exclude `/api/*`
- image remote patterns are permissive (`hostname: '**'`)
- frontend build config currently ignores TypeScript and ESLint failures during build
- inconsistent CMS base URL env usage (`STRAPI_URL` vs `NEXT_PUBLIC_STRAPI_URL`) can cause environment-specific defects

These are common growth-stage trade-offs, but they should be actively prioritized as traffic and team size increase.

## Deployment and operations model

### Frontend deployment: Vercel

The app is configured for Vercel with region targeting and standalone output.

Operationally, this yields:

- fast deploy loops
- straightforward preview workflows
- strong alignment with Next.js runtime features

### CMS deployment: Cloud Run + Cloud SQL + Secret Manager

The Strapi service uses:

- multi-stage Docker builds
- Cloud Run for runtime hosting
- PostgreSQL via Cloud SQL socket path in production
- Secret Manager for critical keys/salts
- Artifact Registry image publishing in deployment scripts

This is a credible production pattern for managed containerized services.

**Trade-offs:**

- two-platform operations (Vercel + GCP) increase cognitive overhead
- manual/scripted infra workflows are faster initially but less reproducible than full IaC
- incident response and observability require deliberate cross-platform instrumentation

### Environment variable operations

The project includes scripts to sync `.env` variables into Vercel environments.

This improves deploy consistency and avoids manual dashboard drift.

**Trade-off:** script-based secret handling must be audited carefully to avoid accidental leakage in local shell history/logs.

## Developer experience and quality posture

### Tooling choices

DX is built around:

- TypeScript
- ESLint
- Prettier
- `knip` for dependency hygiene
- modern package/runtime tooling around Next.js

This is a practical, maintainable baseline for a product-focused team.

### Testing and verification posture

The repository shows strong product implementation velocity, but limited visible automated test coverage and no obvious CI pipeline in the repository itself.

Combined with build-time type/lint bypass settings, this creates a classic trade-off:

- **short-term shipping velocity**
- versus **higher long-term regression risk**

For portfolio context, this is understandable in early-stage execution, but worth tightening as feature breadth grows.

## Major trade-offs and future hardening priorities

The architecture makes sensible trade-offs for a startup-style product:

- **Separation over simplicity:** independent app + CMS services increase ops complexity but improve ownership boundaries.
- **Velocity over strict gates (for now):** quick iteration is enabled, but quality gates need to harden before scale.
- **Rich UX over minimal bundles:** motion and visual components help differentiation but raise performance governance needs.
- **Managed services over custom infra:** Vercel + GCP remove heavy platform work but increase vendor coupling.
- **Content flexibility over rigid schemas:** SEO/editorial power is strong, but consistency needs conventions and validation discipline.

Recommended next hardening steps:

1. re-enable strict type/lint build failures in CI for protected branches
2. add rate limiting/bot protection to all public write endpoints
3. normalize Strapi environment variable strategy across all app routes
4. add baseline integration tests for core conversion and content paths
5. add unified error monitoring/alerting across frontend and CMS runtimes

## What this architecture demonstrates

From a portfolio engineering perspective, artefficient.io demonstrates:

- **Pragmatic system design:** right-sized architecture for a content-heavy, AI-enabled product
- **Product-aware technical choices:** stack aligns to conversion UX, editorial agility, and multilingual growth
- **Real-world integration depth:** AI, email delivery, CMS, media storage, and multi-cloud deployment in one cohesive system
- **Strong extensibility path:** clear boundaries for future work in auth, analytics depth, testing, and platform hardening

The main takeaway is that this codebase is engineered as a production product platform, not a demo site. The team prioritized speed, storytelling UX, and content operability, while accepting the operational and quality trade-offs that come with that ambition.
