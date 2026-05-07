# Launch Kit

## GitHub Description

Local-model mode for your existing OpenClaw/Codex workspace.

## Topics

`openclaw`, `codex`, `ollama`, `agents`, `local-first`, `ai-agent`, `agent-audit`, `cli`, `nodejs`

## README Hook

Clawdeck makes local models feel like a real mode inside the OpenClaw/Codex workspace you already use: adopt the workspace, apply a backed-up local Ollama profile, drill readiness, and smoke-test actual local inference.

## Launch Post Draft

I built Clawdeck: a tiny CLI that turns local Ollama models into a verified mode inside your existing OpenClaw/Codex workspace.

It does not create a separate toy agent folder. It adopts your current OpenClaw workspace, adds a `CLAWDECK.md` local-mode contract, preserves existing providers/plugins/auth, points the active default path at Ollama, then proves the path with `drill` and `smoke`.

Try it:

```bash
npx github:dicnunz/clawdeck adopt
npx github:dicnunz/clawdeck apply --yes
npx github:dicnunz/clawdeck drill
npx github:dicnunz/clawdeck smoke
npx github:dicnunz/clawdeck handoff
```

GitHub: https://github.com/dicnunz/clawdeck

## Resume Bullet

Built Clawdeck, an open-source Node CLI that adopts existing OpenClaw/Codex workspaces into a verified local-model mode with backed-up config apply, preserved provider state, Ollama/OpenClaw smoke tests, Codex handoff briefs, offline drill gates, polished local audit reports, tests, schemas, CI, and source-checked product claims.
