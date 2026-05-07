# Clawdeck

Local-model mode for the OpenClaw/Codex setup you already use.

Clawdeck is not another agent framework and it is not a separate worse Codex clone. It is a thin operating layer that adopts your existing OpenClaw workspace, makes the active model path local-first through Ollama, and gives both OpenClaw and Codex a shared `CLAWDECK.md` local-mode contract.

Once OpenClaw, Ollama, and the model weights are installed, local file/code work can keep running without wifi. Internet search, remote APIs, account auth, cloud models, and some tool-heavy workflows still need network access.

## Quick Start

Adopt the OpenClaw workspace you already have:

```bash
npx @nicdunz/clawdeck adopt
npx @nicdunz/clawdeck apply --yes
npx @nicdunz/clawdeck drill
npx @nicdunz/clawdeck smoke
npx @nicdunz/clawdeck handoff
```

Or point it at a specific project/workspace:

```bash
npx @nicdunz/clawdeck adopt .
npx @nicdunz/clawdeck apply --workspace . --yes
npx @nicdunz/clawdeck audit
```

If the scoped npm package is not published in your registry yet, use the GitHub installer:

```bash
npx github:dicnunz/clawdeck adopt
```

You get:

- `CLAWDECK.md`: the local-mode switchboard for OpenClaw and Codex
- a non-destructive `AGENTS.md` pointer so existing agents see the local contract
- a backed-up OpenClaw config apply
- active Ollama defaults without deleting existing providers/plugins/auth
- no hosted model fallback in the active model path
- a no-wifi readiness drill
- a real local-model smoke test through Ollama and OpenClaw inference
- a Codex Mac handoff brief for opening the same workspace in Codex
- optional redacted Markdown/HTML/JSON/SVG audit outputs

That is the point: Clawdeck turns local mode into something you can adopt, verify, and keep using inside your normal setup.

## Commands

```bash
clawdeck adopt [workspace] [--home dir] [--name name] [--force] [--no-agents-link]
clawdeck apply [--workspace dir] [--home dir] [--yes]
clawdeck drill
clawdeck smoke [--model ollama/name] [--home dir] [--timeout ms] [--no-openclaw]
clawdeck handoff [--home dir] [--no-checks]
clawdeck audit --out report.md --html report.html --json audit.json --card card.svg
clawdeck local [dir] [--name name] [--force]
clawdeck doctor [--json]
clawdeck snapshot --out setup.json
```

`adopt` is the main path. It detects your existing OpenClaw workspace from `~/.openclaw/openclaw.json`, overlays missing Clawdeck files without overwriting your workspace, and links `AGENTS.md` to `CLAWDECK.md`.

`apply` backs up `~/.openclaw/openclaw.json`, points the active default model setup at local Ollama models, and preserves existing providers/plugins/auth/gateway settings.

`drill` checks whether the local path is ready. `smoke` goes further and asks the selected local model to reply through Ollama and OpenClaw inference.

`handoff` prints a compact brief you can paste into Codex Mac app so Codex uses the same `CLAWDECK.md` local-mode contract instead of treating the folder as a random repo.

## Example Output

```text
Clawdeck offline drill: blocked
Local agent stack: primary=ollama/qwen3:4b-instruct, ollamaModels=7, gateway=warn, workspaceFiles=7/7, activeHostedFallback=none.

READY Workspace contract: 7/7 command-center files present
READY Local-model defaults: No hosted model aliases in active defaults
READY Ollama reachable: 7 Ollama models detected
READY Configured model weights: 3/3 configured models installed
READY OpenClaw CLI: doctor=pass
BLOCKED OpenClaw gateway: doctor=warn

Next: openclaw gateway start && openclaw gateway status --json
```

```text
Clawdeck smoke: pass
Model: ollama/qwen3:4b-instruct

PASS Ollama model reply: ok
PASS OpenClaw local inference: model.run via local provider: ollama model: qwen3:4b-instruct outputs: 1 ok
```

## What It Adds

```text
existing-openclaw-workspace/
  AGENTS.md              # preserved, with a Clawdeck pointer block
  CLAWDECK.md            # local-mode switchboard
  OFFLINE.md
  HEARTBEAT.md
  SOUL.md
  TOOLS.md
  USER.md
  .openclaw/
    openclaw.template.json
  prompts/
    launch-brief.md
```

The active local model lineup:

- primary: `ollama/qwen3:4b-instruct`
- code: `ollama/qwen2.5-coder:7b`
- fast fallback: `ollama/llama3.2:3b`
- hosted fallback: none in the active default model aliases

## Install OpenClaw And Models

Clawdeck does not install OpenClaw, install Ollama, pull models, or start daemons for you.

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
ollama pull qwen3:4b-instruct
ollama pull qwen2.5-coder:7b
ollama pull llama3.2:3b
```

## Claim Boundaries

- Clawdeck is MIT-licensed project glue around OpenClaw and Ollama; it is not affiliated with OpenAI, OpenClaw, or Ollama.
- "Free" means no per-token API bill for the local Ollama path. It does not mean free hardware, free electricity, or free optional cloud/search features.
- "Offline" means local files, local shell, local OpenClaw gateway workflows, and already-pulled Ollama models. Network-dependent tasks remain blocked.
- Local small models are useful for many workflows but are not equivalent to latest hosted frontier models for hard reasoning, browser automation, or security-sensitive tool use.
- See [docs/claim-check.md](docs/claim-check.md) for the source-backed claim audit.

## Why It Exists

Most local-agent setups are either raw dotfiles or separate demo folders. Clawdeck makes local mode a first-class layer in the OpenClaw/Codex workspace you already use: adopt it, prove it, smoke test it, and keep the cloud/local boundary explicit.

## Safety

Clawdeck does not copy OAuth files, transcripts, browser state, private memory databases, `~/.openclaw/agents`, or `~/.openclaw/tasks`.

Use `clawdeck snapshot` when you want to show your setup publicly.

## License

MIT
