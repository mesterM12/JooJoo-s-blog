---
title: My homelab architecture and why I built it this way
author: Armin Mohebbipour
pubDatetime: 2026-03-11T12:00:00Z
slug: my-homelab-setup
featured: false
draft: false
tags:
  - homelab
  - infrastructure
  - systems
description: A complete architecture write-up of my homelab, including Proxmox virtualization, VM workload design, container services, and operational hardening.
---

When people hear "homelab," they usually picture a pile of hobby services. Mine started that way, but over time I began treating it more like a small engineering environment. It is where I test architecture ideas, run real services, and deal with the kinds of operational issues that only show up once something actually matters.

This write-up documents the current setup, why I arranged it this way, and the trade-offs I am willing to accept to keep it useful.

I was never trying to run the most services possible. I wanted an environment that:

- separates infrastructure concerns cleanly
- supports mixed workloads (Linux services, Windows GPU tasks, security tooling)
- remains recoverable when something fails
- reflects real-world operational thinking, not just one-off experiments

## Table of contents

## High-level architecture

At a high level, the lab is centered around a Proxmox host (`pve`) that runs dedicated VMs for different responsibilities:

- **Ubuntu VM (`shippy`)** as the main container and service host
- **Kali Linux VM** for security tooling and testing workflows
- **Windows Server VM** with GPU passthrough for media workloads (Jellyfin)

This structure gives me hard workload boundaries while still keeping management centralized in one virtualization plane.

### Why this structure works for me

- **Isolation:** each VM has a clear purpose, which reduces blast radius during changes.
- **Flexibility:** I can tune resources per VM instead of forcing every workload into one OS model.
- **Practicality:** I can run Linux-native services and Windows-specific GPU workflows in the same lab.

## Virtualization layer (Proxmox)

The Proxmox node runs as:

- **Node:** `pve`
- **Platform:** `pve-manager/9.1.6`

I use Proxmox as the control point for compute allocation, lifecycle operations, and workload placement decisions. The important part is not just "virtualization exists," but that it enables intentional boundaries between infrastructure roles.

## Main service plane: Ubuntu VM (`shippy`)

`shippy` is the primary platform-services VM and the place where most day-to-day application workloads run.

- **Hostname:** `shippy`
- **Kernel:** `6.8.0-101-generic`
- **Compose projects:** one base stack with split compose files for core services, webcam-related workloads, and reverse-proxy edge services

This keeps service definitions modular while still operating as one coherent platform environment.

## Container stack by function

Instead of treating containers as one long list, I group them by engineering function.

### Arr stack automation pipeline

I use an Arr stack as a coordinated automation pipeline. Instead of one monolithic service, indexing, request handling, transfer orchestration, and post-processing are separated into focused components.

From an engineering perspective, this behaves like a small distributed system with clear integration points between each stage, which makes scaling, troubleshooting, and upgrades more manageable.

### Access, routing, and platform control

- `traefik` for ingress and TLS termination
- `authentik-server`, `authentik-worker`, plus Postgres/Redis for identity and access control
- Cloudflare DDNS updater for dynamic edge IP management
- `portainer` for operational visibility and container management
- `homarr` as a unified service dashboard

This is the layer that made the lab feel like a real platform instead of a pile of containers. Exposure goes through an edge proxy, identity is centralized, and day-to-day operations are visible instead of improvised.

#### Why I use Traefik

Traefik is my edge gateway because it supports container auto-discovery and dynamic routing. As services are added or updated, routes can be managed through service metadata instead of hand-editing static proxy configs each time.

That keeps the ingress layer maintainable as the stack grows and lowers the chance of routing drift between what is deployed and what is exposed.

#### Why I use Authentik

Authentik is my identity management layer for self-hosted apps. It gives me centralized auth policy, consistent login flows, and better control over who can access what across the environment.

Combined with Traefik, it helps enforce "identity first" access patterns instead of relying on network location alone.

#### Why I use Portainer

Portainer is mostly a convenience tool, but a useful one. It makes container lifecycle tasks, stack visibility, and quick diagnostics much faster than doing everything through the CLI alone.

I still treat infrastructure as code with compose files, but Portainer gives an efficient operational surface for day-to-day management.

### Utility and specialist workloads

- `calibre` and `calibre-web` for ebook services
- `dashdot` for host/system dashboarding
- `octoprint` for 3D printing workflows

Keeping these as independent services lets me evolve or replace one capability without destabilizing unrelated workloads.

## Windows Server: RDS workstation + Jellyfin

The Windows Server VM does double duty: it runs an RDS environment so multiple people can use it as a workstation at the same time, and it also handles GPU-backed Jellyfin workloads. I set it up this way on purpose:

- Running RDS on a dedicated VM gives shared workstation access without putting that multi-user session load on my Linux service host.
- GPU passthrough gives efficient hardware-accelerated media processing.
- Keeping it in a dedicated VM avoids mixing media-specific driver/runtime concerns into the Linux service host.
- The result is cleaner separation between platform services, shared user sessions, and high-throughput media workloads.

## Security and resilience practices

For me, a homelab stops being interesting the moment it ignores backup, recovery, access control, or update hygiene.

### Acronis for backup, protection, and centralized management

I use Acronis for backup and recovery, but also for endpoint security and management. The key value is not only having restore points, but having one platform that helps me protect, monitor, and recover systems.

Its behavior engine adds anti-virus and anti-malware protection by detecting suspicious activity patterns, which complements the network and access controls in the rest of the stack.

### fail2ban for abuse resistance

`fail2ban` adds a practical defensive layer by automatically reacting to repeated malicious authentication behavior. In internet-exposed environments, this baseline control meaningfully reduces noise and brute-force pressure.

### Watchtower for container lifecycle hygiene

I use Watchtower to keep container images current as part of routine maintenance. This improves security posture and lowers drift, while still keeping update behavior explicit and observable.

### Twingate as primary VPN and remote access layer

I run a dedicated `twingate-connector` LXC on Proxmox and use Twingate as my primary VPN solution for remote access into the homelab.

- It gives identity-aware access to internal services without broadly exposing the network over traditional flat VPN access.
- It maps cleanly to my service-boundary approach: users get access to specific resources instead of full network trust.
- Operationally, it is lightweight to maintain and fits well with the rest of the stack where access policy is explicit (similar to how I use Authentik at the application layer).

This improves both security and usability: I can grant least-privilege remote access while keeping management overhead reasonable.

## Trade-offs and why they are acceptable

No architecture is free. This setup deliberately accepts a few trade-offs:

- **Higher operational surface area:** multiple VMs and many containers require disciplined service management.
- **More moving parts in identity and ingress:** Authentik + Traefik + DDNS introduces complexity, but provides much better control than direct unmanaged exposure.
- **Virtualization overhead:** acceptable because isolation, flexibility, and recoverability are worth it for this lab's goals.

I am fine with those trade-offs because they line up with what I am actually trying to practice: system design under realistic constraints.

## What I got out of building it

The biggest value in this homelab has been practice. It gave me a place to think about workload boundaries, mixed-platform systems, ingress, identity, recovery, and routine operations in a way that feels much closer to real engineering work than a one-off side project.

More than anything, it gave me confidence that I can design, operate, and gradually improve a multi-layer environment where every component has a purpose and failure handling is part of the plan from the start.
