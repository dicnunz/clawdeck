# Release Readiness Audit

Date: 2026-05-07

## Objective

Turn the local-model Codex/OpenClaw setup into a polished, non-gimmicky product that integrates with existing OpenClaw/Codex Mac workflows, works offline/local-first, is thoroughly tested, and is credible enough to release publicly.

## Prompt-To-Artifact Checklist

| Requirement | Artifact | Evidence |
| --- | --- | --- |
| Feels like part of existing OpenClaw/Codex setup, not a separate worse tool | `clawdeck adopt`, `clawdeck handoff`, `templates/CLAWDECK.md`, bounded `AGENTS.md` pointer | `src/adopt.js` detects an existing OpenClaw workspace, overlays missing files, preserves existing `AGENTS.md`, and adds a Clawdeck pointer block. `src/handoff.js` prints a Codex Mac app brief from the same workspace. |
| Local models run on the computer | Ollama defaults in `.openclaw/openclaw.template.json` | Template primary is `ollama/qwen3:4b-instruct`; code and fast fallback models are Ollama refs. |
| No-wifi-after-setup claim is bounded and truthful | `README.md`, `templates/OFFLINE.md`, `docs/claim-check.md` | Docs limit offline support to local files, shell, OpenClaw local workflows, and already-pulled Ollama models; web/search/account/cloud work is explicitly excluded. |
| Existing OpenClaw config is preserved | `clawdeck apply` | `src/apply.js` merges local Ollama defaults while preserving existing providers, plugins, auth, gateway, and agent runtime fields. |
| Actual local inference is proven | `clawdeck smoke` | `src/smoke.js` runs both `ollama run <model>` and `openclaw infer model run --model ollama/... --prompt "Reply with exactly: ok"`. |
| Readiness is not hand-waved | `clawdeck drill`, `clawdeck audit` | `src/audit.js` checks workspace files, active local defaults, Ollama reachability, installed model weights, OpenClaw CLI, and gateway status. |
| Shareable public surface exists | HTML/Markdown/JSON/SVG audit outputs, launch kit, release notes | `clawdeck audit` renders report artifacts; `docs/launch-kit.md` and `docs/release-notes/v0.1.0.md` are launch-ready. |
| Safety and privacy are explicit | `docs/security.md`, `src/sanitize.js`, `clawdeck snapshot` | Snapshot/report paths redact secret-shaped keys, email addresses, and home paths, and docs state which private OpenClaw state is not copied. |
| Tests cover behavior, not just docs | `test/*.test.js` | Tests cover adopt, apply merge/backup, audit/drill, handoff, CLI help, init, sanitize/snapshot, smoke runner behavior, and an actual CLI temp-home flow. |
| Public repo is credible | GitHub Actions CI | `.github/workflows/ci.yml` runs `npm run verify` on Node 20 and 22. |
| Public release path is known | `docs/github-release-runbook.md` | Runbook includes repo creation, tag push, topics, release creation, and proof commands. Local tag `v0.1.0` points at the final release commit. |

## Verified Locally

These checks were run locally during release prep:

- `npm test`
- `git diff --check`
- `npm pack --dry-run`
- `npm run verify`
- packed tarball CLI help through `npm exec --package <tarball> -- clawdeck help`
- CLI temp-home flow through `bin/clawdeck.js`: `adopt -> apply -> drill`
- temp existing-workspace flow: `adopt -> apply -> openclaw config validate --json -> drill -> smoke`
- real local smoke through installed Ollama and OpenClaw inference using `ollama/qwen3:4b-instruct`
- public-claim source check against Codex CLI, OpenClaw, and Ollama docs

## Known Boundaries

- The public GitHub repo was not created during local prep.
- Browser visual QA of the generated `file://` HTML report was blocked by Browser Use URL policy; the generated HTML/CSS and CLI artifact creation were verified, but not through in-app browser rendering.
- The OpenClaw gateway on this Mac reported stopped/unhealthy during drill, which is a machine setup status, not a package failure. `clawdeck smoke` still passed through local OpenClaw inference.

## Release Gate

Public release still requires fresh exact approval because it creates a public GitHub repo, pushes commits/tags, edits repo metadata, and creates a GitHub release.
