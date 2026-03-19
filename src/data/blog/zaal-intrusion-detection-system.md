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

Zaal was one of my most hands-on security projects. I built it end to end with very little abstraction: a backend API in Node.js and TypeScript, a plain HTML and TypeScript frontend, and a host-side script flow that watched Windows Event Logs for RDP activity.

I was not trying to build a full enterprise SIEM. I wanted to prove something simpler: even with a modest stack and a lot of manual implementation, you can still build a useful detection and response pipeline that catches suspicious behavior and alerts people quickly.

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

That gave me direct control over event ingestion and response policy, which was exactly what I wanted for a project like this. It made it easier to see where detection systems can fail and where I needed to harden things over time.

## Security model (manual hashing, salting, and token auth)

Authentication and credential handling were implemented manually as part of the learning objective.

- passwords were hashed and salted before storage
- tokens were issued and validated by custom middleware logic
- auth checks were explicit in route handlers instead of delegated to large framework plugins

This was more work than using an off-the-shelf auth package, but that was part of the point. I wanted to reason through the security model from first principles and see the trust boundaries and failure modes directly in the code.

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

It was a simple intrusion detection system, but it worked well enough to act as an early warning mechanism for suspicious remote access attempts.

## Alerting and response (Twilio + IP banning)

Zaal integrated Twilio to notify support staff when repeated failed login patterns were detected.

Alert channels included:

- SMS text alerts for immediate visibility
- email alerts for escalation and record keeping

When failed-login thresholds were crossed, the system also applied an automated defensive action by banning the source IP. This gave the platform a simple but effective response loop: detect, alert, and contain.

## Trade-offs and limitations

Like most first-principles security projects, Zaal had some obvious limitations:

- **Detection depth:** event-log pattern matching is useful but not comprehensive
- **Potential false positives:** repeated failures can come from both attackers and legitimate user mistakes
- **Manual operations burden:** custom auth and scripting increase maintenance overhead
- **Scalability limits:** the design was practical for small to medium environments, not a full enterprise SOC replacement

I was fine with those trade-offs because the goal was to build and understand the full path from event detection to incident response, not to imitate a commercial security platform.

## What I learned from building Zaal

What I still like about Zaal is that it forced me to build every part of the loop myself: the API, the auth flow, the event ingestion, the alerting path, and the response behavior. It was a good reminder that even a carefully scoped system can be useful if it is focused on the right thing.

For this project, that thing was speed. I cared more about detecting suspicious behavior quickly and responding in a simple, actionable way than I did about building a giant platform. Zaal ended up teaching me a lot about backend engineering, security design, and how much value you can still get from a manually built system when the scope is disciplined.
