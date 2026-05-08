# Product Spec

## Name

Clawdeck

## Promise

Adopt an existing OpenClaw/Codex workspace and turn its active local path into a verified Ollama-backed mode for no-wifi-after-setup local file/code work.

## Audience

Builders who already use OpenClaw, Codex, or Ollama and want local models to feel like a real mode inside their normal setup instead of a separate demo folder.

## Core Loop

1. Run `clawdeck setup --yes` in an existing setup.
2. Pull any missing Ollama models named by setup.
3. Run `clawdeck smoke` to prove actual local inference through Ollama and OpenClaw.
4. Run `clawdeck handoff` when opening the same workspace in Codex Mac app.
5. Use `CLAWDECK.md` as the local-mode contract from OpenClaw or Codex.
6. Run `clawdeck audit` when a shareable report is useful.

Manual mode is still available as `adopt -> apply --yes -> drill -> smoke -> handoff`.

## Differentiator

Clawdeck is not another agent framework and not a static scaffold. It is a local-mode adoption layer: it links into the workspace you already use, preserves your existing OpenClaw setup, verifies local model readiness, and smoke-tests actual local inference.

## Non-Goals

- Do not copy auth state.
- Do not manage paid model accounts.
- Do not hide OpenClaw config behind magic.
- Do not delete existing providers/plugins/auth to make the demo look pure.
- Do not install background services without the user doing it explicitly.
- Do not pretend a stack is healthy just because config files exist.
- Do not claim local small models are equivalent to hosted frontier models.
- Do not claim internet search, remote APIs, or account-bound tools work offline.

## Success Criteria

- `clawdeck adopt` can overlay an existing OpenClaw workspace without overwriting existing workspace files.
- `clawdeck setup --yes` gives a first-run path that adopts, applies with backup, runs the drill, and leaves one next command.
- `AGENTS.md` gets a bounded Clawdeck pointer block so Codex/OpenClaw can see the local-mode contract.
- `clawdeck apply --yes` backs up existing OpenClaw config and preserves existing providers/plugins/auth.
- The active default model aliases are Ollama-only.
- `clawdeck drill` returns a clear ready/blocked verdict and next local command.
- `clawdeck smoke` proves a local model reply through Ollama and OpenClaw inference.
- `clawdeck handoff` prints a Codex-ready local-mode brief from the current workspace.
- `clawdeck audit` produces Markdown, HTML, JSON, and SVG report outputs.
- Public reports avoid auth state, private paths, and raw config dumps.
- The public package uses the scoped npm name `@nicdunz/clawdeck`, while the `clawdeck` binary remains the command users run.
- Running readiness checks from the source checkout points users toward adopting a real workspace instead of mutating the product repo by mistake.
