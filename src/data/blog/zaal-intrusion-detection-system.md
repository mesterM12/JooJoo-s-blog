---
title: Building Zaal, a manual RDP intrusion detection system
author: Armin Mohebbipour
pubDatetime: 2026-03-11T12:00:00Z
slug: zaal-intrusion-detection-system
featured: false
draft: false
tags:
  - security
  - nodejs
  - typescript
  - intrusion-detection
description: A full write-up of Zaal, a manually built Node.js and TypeScript system that monitors Windows RDP logins, alerts support staff through Twilio, and bans abusive IPs.
---

Zaal was one of my most hands-on security projects. I built it end to end with minimal abstraction: a backend API in Node.js and TypeScript, a plain HTML plus TypeScript frontend, and a host script workflow that watched Windows Event Logs for RDP activity.

It was not meant to be a perfect enterprise SIEM. It was meant to prove a practical point: even with a simple stack and manual implementations, you can build a working detection and response pipeline that catches suspicious behavior and alerts people quickly.

The design goals were straightforward:

- keep the implementation transparent and fully manual
- detect remote desktop login activity as early as possible
- notify IT support staff immediately on risky login patterns
- enforce a basic automated response by banning repeat offenders

## Table of contents

## High-level architecture

At a high level, Zaal had three working layers:

- **Control/API layer:** Node.js + TypeScript backend serving auth, events, and response endpoints
- **Presentation layer:** a frontend built with only HTML and TypeScript (no framework)
- **Endpoint monitoring layer:** generated PowerShell script that monitored Windows Event Logs and pinged the API on matching RDP events

The system flow was simple by design. Endpoint script detects an event, sends data to the API, API evaluates thresholds, and then triggers notifications and response actions.

## Backend API (Node.js + TypeScript + MongoDB)

The backend was a custom POST API written in Node.js and TypeScript, with MongoDB as the data store. I intentionally built this layer manually instead of leaning on higher-level auth/security frameworks because I wanted full control over each step of the request flow.

Core backend responsibilities:

- receive login and failed-login event payloads from monitored machines
- persist event history in MongoDB for threshold and trend checks
- authenticate users and API calls using token-based auth
- invoke Twilio notifications when failure conditions were met
- apply IP ban logic when repeated suspicious attempts crossed limits

This architecture gave me direct control over event ingestion and response policy, which was useful for understanding where detection systems can fail and how to harden them incrementally.

## Security model (manual hashing, salting, and token auth)

Authentication and credential handling were implemented manually as part of the learning objective.

- passwords were hashed and salted before storage
- tokens were issued and validated by custom middleware logic
- auth checks were explicit in route handlers instead of delegated to large framework plugins

This was more work than using an off-the-shelf auth package, but it made the security model easier to reason about from first principles. I could see every decision path, every trust boundary, and every failure mode directly in code.

## Frontend architecture (HTML + TypeScript only)

The frontend was fully built with vanilla HTML and TypeScript, with no framework.

That decision had trade-offs, but it aligned with the project goal of understanding and controlling all moving parts. Instead of component abstractions, routing libraries, and framework state systems, UI behavior was implemented directly.

In practice, this meant:

- lighter runtime overhead
- no framework lifecycle complexity
- more manual DOM and state handling work

For this project, the manual approach was acceptable because the UI scope was controlled and the main complexity lived in security workflow logic, not interface composition.

## Endpoint detection flow (PowerShell + Windows Event Log)

One of the most important features in Zaal was script-based endpoint onboarding.

The platform generated a script that, when run on a Windows machine, created a PowerShell (`.ps1`) monitor process. That process watched Windows Event Logs for RDP login activity and then pinged the backend API whenever a relevant event was detected.

Detection pipeline:

1. install and run generated monitor script on endpoint
2. monitor Event Log entries related to RDP login activity
3. submit event metadata to the backend API in near real time
4. classify event as success/failure and update counters
5. trigger alerting and response when thresholds were exceeded

This was a rudimentary intrusion detection system, but it worked as a practical early warning mechanism for suspicious remote access attempts.

## Alerting and response (Twilio + IP banning)

Zaal integrated Twilio to notify support staff when repeated failed login patterns were detected.

Alert channels included:

- SMS text alerts for immediate visibility
- email alerts for escalation and record keeping

When failed-login thresholds were crossed, the system also applied an automated defensive action by banning the source IP. This gave the platform a simple but effective response loop: detect, alert, and contain.

## Trade-offs and limitations

Like most first-principles security projects, Zaal deliberately accepted some limitations:

- **Detection depth:** event-log pattern matching is useful but not comprehensive
- **Potential false positives:** repeated failures can come from both attackers and legitimate user mistakes
- **Manual operations burden:** custom auth and scripting increase maintenance overhead
- **Scalability limits:** the design was practical for small to medium environments, not a full enterprise SOC replacement

Those trade-offs were acceptable because the project objective was to build and understand the full path from event detection to incident response, not to replicate a commercial security platform.

## What Zaal demonstrates as engineering work

Zaal demonstrates practical capability across backend engineering, security design, and systems thinking:

- building a complete Node.js + TypeScript API with MongoDB
- implementing hashing, salting, and token auth manually
- connecting Windows endpoint telemetry to a central backend
- creating an actionable response pipeline with Twilio and IP bans

Most importantly, it proved that a carefully scoped, manually built system can still provide meaningful security value when speed of detection and response is the priority.
