---
title: Technologies used to build this website
author: Armin Mohebbipour
pubDatetime: 2026-03-11T12:00:00Z
slug: technologies-used-to-build-this-website
featured: false
draft: false
tags:
  - docs
  - tech-stack
description: A complete overview of the tools, frameworks, and services used in this website.
---

When people look at a portfolio or blog, they mostly see the design, content, and speed. What they do not see is the set of decisions that make those things possible. This post is a complete write-up of the stack behind this website and, more importantly, why each choice was made.

The goal was not to pick trendy tools. The goal was to build a site that:

- loads quickly on real devices and networks
- stays easy to maintain as content grows
- keeps the writing workflow simple
- supports polished visuals without turning the codebase into a mess

Below is the full breakdown of the architecture, tooling, and trade-offs.

## Table of contents

## High-level architecture

This website is built as a **content-first static site** with selective interactivity.

In practice, that means most pages are generated to static HTML during build time, and JavaScript is only used when a section actually needs interactivity. This approach gives us fast first paint and strong SEO by default, while still allowing dynamic UI where it improves the user experience.

### Why this architecture works well

- **Performance:** less JavaScript shipped to the browser means faster load and better responsiveness.
- **Reliability:** static pages have fewer runtime failure points than fully client-rendered apps.
- **Scalability for content:** adding posts is mostly markdown + metadata, not app logic.

## Core framework

This site is built with [Astro](https://astro.build/), which is a strong fit for documentation, blogs, and portfolio projects.

Astro gives this project three major advantages:

- **Static-first rendering** for excellent baseline speed and caching behavior.
- **Islands architecture** so we can hydrate only the components that need client-side interaction.
- **A clean content workflow** using markdown files and structured frontmatter.

From a user perspective, this translates to quick navigation, readable pages, and fewer layout or hydration issues. From a developer perspective, it keeps complexity under control.

## Language and component layer

### TypeScript

[TypeScript](https://www.typescriptlang.org/) is used throughout the project to reduce accidental bugs and improve confidence during refactors. With content-heavy sites, many bugs happen in "glue code" (metadata parsing, path building, helpers). Type safety helps catch those earlier.

### Svelte in Astro islands

[Svelte](https://svelte.dev/) is integrated via `@astrojs/svelte` for interactive sections. We chose Svelte because it is expressive, lightweight, and ideal for focused UI interactions without large framework overhead.

### xterm.js for terminal-style interactions

For terminal-like UI moments, we use [xterm.js](https://xtermjs.org/) with `@xterm/xterm` and `@xterm/addon-fit`. 

### Utility libraries

Several small utilities support the content layer and URL consistency:

- `dayjs` for date handling and formatting
- `slugify` and `lodash.kebabcase` for stable URL/text transformations

These tools reduce custom one-off logic and keep behavior predictable across posts and routes.

## Styling and design system

### Tailwind CSS v4

[Tailwind CSS v4](https://tailwindcss.com/) powers the styling layer. We use it because it enables rapid iteration while keeping styles close to component markup. That improves maintainability and reduces style drift over time.

`@tailwindcss/vite` keeps the integration smooth in the Astro/Vite pipeline.

### Typography plugin for long-form readability

`@tailwindcss/typography` is especially important for blog posts. It gives consistent spacing, heading rhythm, list styles, and code block readability. In other words, it improves scanning and reduces visual fatigue for readers.

### Motion and interaction polish

For animation where it adds clarity or delight, we use `gsap`. The intent is not to animate everything; it is to use motion selectively for narrative and transitions while preserving performance.

## Content, markdown, and code blocks

Blog content lives in markdown files under `src/data/blog`. This keeps authoring simple and version-control friendly.

To improve both author workflow and reader experience, the project uses:

- [remark-toc](https://github.com/remarkjs/remark-toc) to generate table of contents sections automatically.
- [remark-collapse](https://github.com/Rokt33r/remark-collapse) for collapsible content blocks where progressive disclosure helps readability.
- [Shiki](https://shiki.style/) with `@shikijs/transformers` for high-quality code syntax highlighting.

For developers reading technical posts, Shiki is a big quality improvement: token-accurate highlighting makes examples easier to parse and trust.

## Search and discoverability

### Pagefind for static search

[Pagefind](https://pagefind.app/) is used to build a static search index during the build process. This means users get fast, relevant search without needing a dedicated search backend.

### SEO and feed integrations

- `@astrojs/sitemap` generates sitemap output for search engines.
- `@astrojs/rss` generates RSS feeds for subscribers and feed readers.

Together, these improve both discoverability and content distribution without adding operational complexity.

## Images and social sharing

### Image optimization with Sharp

[Sharp](https://sharp.pixelplumbing.com/) handles image processing for web delivery. Optimized image assets improve loading speed and reduce bandwidth usage, which directly affects Core Web Vitals.

### Dynamic Open Graph image generation

For social sharing previews, we use [Satori](https://github.com/vercel/satori) with `@resvg/resvg-js` to generate OG images programmatically. This keeps social cards consistent with site branding and post metadata without manually designing each image.

When links are shared, better OG cards increase clarity and click-through quality.

## Build, quality, and developer tooling

### Build pipeline

The build command does three important steps:

1. `astro check` for type and Astro diagnostics
2. `astro build` for static site generation
3. `pagefind --site dist` to create search indexes

This ensures static output and search stay aligned every time we ship.

### Code quality and consistency

- [ESLint](https://eslint.org/) enforces quality and catches risky patterns.
- [Prettier](https://prettier.io/) standardizes formatting.
- `prettier-plugin-astro` and `prettier-plugin-tailwindcss` keep Astro and utility classes consistently formatted.
- `eslint-plugin-astro` and TypeScript tooling (`typescript`, `typescript-eslint`) provide framework-aware linting and type checks.

These tools mostly improve team velocity over time: fewer style debates, fewer preventable regressions, and easier reviews.

## Trade-offs and why they are acceptable

No stack is perfect, so it is worth being explicit about trade-offs:

- **Less runtime flexibility than a full SPA/backend app:** acceptable because this project is mostly content-driven.
- **Build-time processing cost:** acceptable because it pays off in runtime speed and simpler hosting.
- **Multiple tools in the pipeline:** manageable because each tool has a clear job and strong ecosystem support.

## Final thoughts

This stack is intentionally opinionated: static-first rendering with Astro, selective interactivity with Svelte, utility-first styling with Tailwind, and focused tooling for content, search, and SEO.

The biggest outcome is user experience quality at every step:

- fast initial loads
- readable long-form content
- useful search
- strong sharing previews
- consistent interactions

For maintainers, the same decisions also keep the project sustainable: writing stays simple, updates stay manageable, and quality checks are built into the workflow.
