# Clawdeck

Local-model, no-wifi-after-setup, Codex-feeling workspace for OpenClaw and Ollama.

Clawdeck gives you the part people like about Codex: a compact command-center workspace with clear operating rules, local model defaults, approval gates, and a simple readiness check.

It does not replace Codex, modify Codex, or ship an OpenAI product. It packages a no-cloud OpenClaw profile that feels Codex-like while running on local Ollama models.

Once OpenClaw, Ollama, and the model weights are installed, normal local file/code work can run without wifi. Internet search, remote APIs, account auth, cloud models, and some tool-heavy workflows still need network access.

Run one command to create the local setup:

```bash
npx github:dicnunz/clawdeck local my-local-codex
```

Then run:

```bash
cd my-local-codex
npx github:dicnunz/clawdeck apply --workspace . --yes
npx github:dicnunz/clawdeck audit
npx github:dicnunz/clawdeck drill
```

You get:

- a clean OpenClaw/Ollama workspace starter
- a safe apply step that backs up `~/.openclaw/openclaw.json`
- a compact `AGENTS.md` operating contract
- local-only OpenClaw model defaults
- no hosted model fallback in the generated config
- `OFFLINE.md`, `HEARTBEAT.md`, `SOUL.md`, `USER.md`, and `TOOLS.md`
- a `0-100` local readiness score
- a no-wifi readiness drill
- concrete fix commands
- optional redacted Markdown/HTML/JSON/card outputs

It is for people who want the "my laptop is an agent command center" feel without per-token API charges for the local model path. Hardware, electricity, optional cloud models, and web/search features are outside that claim.

## Quick Start

```bash
npx github:dicnunz/clawdeck local my-local-codex
cd my-local-codex
npx github:dicnunz/clawdeck apply --workspace . --yes
npx github:dicnunz/clawdeck audit
npx github:dicnunz/clawdeck drill
```

If you already cloned the repo:

```bash
npm link
clawdeck local my-local-codex
cd my-local-codex
clawdeck apply --workspace . --yes
clawdeck audit
clawdeck drill
```

Example output:

```text
Clawdeck audit: 86/100 (solid)
Local agent stack: primary=ollama/qwen3:4b-instruct, ollamaModels=3, gateway=warn, workspaceFiles=6/6, cloudFallback=none.
Offline drill: blocked - openclaw gateway start && openclaw gateway status --json

Top fixes:
- Start or repair the OpenClaw gateway: openclaw gateway start && openclaw gateway status --json

Wrote:
- report: clawdeck.report.md
- html: clawdeck.report.html
- json: clawdeck.audit.json
- card: clawdeck.card.svg
```

## What It Builds

```text
my-agent/
  AGENTS.md
  HEARTBEAT.md
  OFFLINE.md
  SOUL.md
  TOOLS.md
  USER.md
  .openclaw/
    openclaw.template.json
  prompts/
    launch-brief.md
```

The template is local-only:

- primary model: `ollama/qwen3:4b-instruct`
- code model: `ollama/qwen2.5-coder:7b`
- fast fallback: `ollama/llama3.2:3b`
- hosted fallback: none
- thinking default: `low`

## Commands

```bash
clawdeck local [dir] [--name name] [--force]
clawdeck apply [--workspace dir] [--home dir] [--yes]
clawdeck audit
clawdeck audit --out report.md --html report.html --json audit.json --card card.svg
clawdeck audit --no-write
clawdeck drill
```

`local` scaffolds a no-cloud OpenClaw/Ollama workspace. `apply` backs up and writes the local-only OpenClaw profile. Without `--yes`, `apply` is a dry run. When applied, hosted model providers are removed from the active model config while gateway/auth/meta settings are preserved. `audit` scores the stack and writes optional shareable artifacts. `drill` runs the same readiness gates without writing files and tells you the next command to clear before going offline. The audit checks Node, OpenClaw CLI/config/gateway, local-only model aliases, Ollama, local model presence, workspace files, and share safety.

```bash
clawdeck init [dir] [--name name] [--force]
```

Alias for `local`. Existing files are protected unless `--force` is set.

```bash
clawdeck doctor
clawdeck doctor --json
```

Checks Node, OpenClaw CLI, `~/.openclaw/openclaw.json`, gateway health, and Ollama.

```bash
clawdeck snapshot --out setup.json
```

Reads `~/.openclaw/openclaw.json` and writes a redacted setup snapshot. Secret-shaped fields, auth state, emails, and home paths are scrubbed.

## 60-Second Demo

```bash
clawdeck audit
clawdeck drill
open clawdeck.report.html
```

Expected shape:

```text
Clawdeck audit: 86/100 (solid)
Local agent stack: primary=ollama/qwen3:4b-instruct, ollamaModels=3, gateway=warn, workspaceFiles=6/6, cloudFallback=none.
Offline drill: blocked - openclaw gateway start && openclaw gateway status --json
```

Then fix the top item and rerun the audit. The score should move.

## Install OpenClaw

Clawdeck does not install OpenClaw or download models for you. It keeps those setup steps visible. `clawdeck apply --yes` is the only command that writes your OpenClaw config, and it backs up `~/.openclaw/openclaw.json` first.

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw gateway status --json
```

For local models:

```bash
ollama pull qwen3:4b-instruct
ollama pull qwen2.5-coder:7b
ollama pull llama3.2:3b
```

Then review `.openclaw/openclaw.template.json` before copying any values into your real OpenClaw config.

## Claim Boundaries

- Clawdeck is MIT-licensed project glue around OpenClaw and Ollama; it is not affiliated with OpenAI, OpenClaw, or Ollama.
- "Free" means no per-token API bill for the local Ollama path. It does not mean free hardware, free electricity, or free optional cloud/search features.
- "Offline" means local files, local shell, local OpenClaw gateway workflows, and already-pulled Ollama models. Network-dependent tasks remain blocked.
- Local small models are useful for many workflows but are not equivalent to latest hosted frontier models for hard reasoning, browser automation, or security-sensitive tool use.
- See [docs/claim-check.md](docs/claim-check.md) for the source-backed claim audit.

## Why It Exists

Most agent demos are either cloud dashboards or private dotfile piles. Clawdeck is the middle path: a local-only OpenClaw/Ollama profile that feels like Codex, names what must be installed before going offline, and gives you a drillable audit so you know whether it is actually ready.

## Safety

Clawdeck does not copy:

- OAuth files
- session transcripts
- browser state
- private memory databases
- `~/.openclaw/agents`
- `~/.openclaw/tasks`

Use `clawdeck snapshot` when you want to show your setup publicly.

## License

MIT
