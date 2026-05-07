# Launch Kit

## GitHub Description

Local-model Codex-feeling OpenClaw setup for Ollama.

## Topics

`openclaw`, `codex`, `ollama`, `agents`, `local-first`, `ai-agent`, `agent-audit`, `cli`, `nodejs`

## README Hook

Most agent demos are cloud dashboards or private dotfile piles. Clawdeck is the middle path: a tiny CLI that turns OpenClaw + Ollama into a local-model Codex-feeling workspace that can keep doing local file/code work without wifi after install.

## Launch Post Draft

I built Clawdeck: a tiny CLI that gives OpenClaw + Ollama a local-model Codex-style workspace.

It scaffolds AGENTS/OFFLINE/HEARTBEAT files, applies a backed-up OpenClaw profile with only Ollama model aliases, and runs an offline drill that tells you exactly what is still blocking no-wifi agent work.

Try it:

```bash
npx github:dicnunz/clawdeck local my-local-codex
cd my-local-codex
npx github:dicnunz/clawdeck apply --workspace . --yes
npx github:dicnunz/clawdeck audit
npx github:dicnunz/clawdeck drill
```

GitHub: https://github.com/dicnunz/clawdeck

## Resume Bullet

Built Clawdeck, an open-source Node CLI that turns OpenClaw/Ollama into a source-checked local-model Codex-feeling workspace with backed-up config apply, no hosted model fallback, offline drill gates, polished local audit reports, tests, schema, and CI.
