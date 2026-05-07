# Product Spec

## Name

Clawdeck

## Promise

One command creates a local-model, no-wifi-after-setup OpenClaw/Ollama workspace that feels Codex-like after the required binaries and model weights are installed.

## Audience

Builders who like Codex's command-center feel but want a local-model OpenClaw setup that can keep doing local file/code work without wifi or per-token API cost.

## Core Loop

1. Run `clawdeck local my-local-codex`.
2. Pull the listed Ollama models while online.
3. Run `clawdeck apply --workspace my-local-codex --yes` to back up and write the OpenClaw profile.
4. Use the generated `OFFLINE.md`, `AGENTS.md`, and OpenClaw template as the local operating profile.
5. Run `clawdeck audit` to verify local-only readiness.
6. Run `clawdeck drill` before going offline.
7. Fix one thing and rerun.

## Differentiator

Clawdeck is not another agent framework. It is an offline-first operating profile for OpenClaw: local-only model defaults, Codex-like workspace contract, approval gates, heartbeat queue, readiness score, offline drill gates, concrete fixes, and safe public snapshot.

## Non-Goals

- Do not copy auth state.
- Do not manage paid model accounts.
- Do not hide OpenClaw config behind magic.
- Do not install background services without the user doing it explicitly.
- Do not pretend a stack is healthy just because config files exist.
- Do not silently add hosted model fallback to the generated workspace.
- Do not claim local small models are equivalent to hosted frontier models.
- Do not claim internet search, remote APIs, or account-bound tools work offline.

## Success Criteria

- A user can understand the repo in under one minute.
- The CLI runs with no dependencies beyond Node.
- `clawdeck local` produces a generated config with only Ollama model aliases.
- `clawdeck apply --yes` backs up existing OpenClaw config before writing the local-only profile.
- `clawdeck audit` produces a score, Markdown report, HTML report, JSON, and SVG card.
- `clawdeck drill` returns a clear ready/blocked verdict and next local command.
- A generated workspace has no personal details.
- A snapshot redacts auth-shaped fields and local identity.
- The GitHub page can stand alone as a resume artifact.
