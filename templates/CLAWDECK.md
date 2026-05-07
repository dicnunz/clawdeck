# Clawdeck Local Mode - {{PROJECT_NAME}}

This is the local-model operating layer for this existing OpenClaw/Codex workspace.

## Daily Loop

```bash
clawdeck drill
clawdeck smoke
clawdeck audit
```

Use this workspace for local file/code work when Ollama and OpenClaw are available. Use hosted Codex or hosted OpenClaw models when the task needs frontier reasoning, web access, account auth, browser work, or external APIs.

## Local Model Routing

- Primary: `ollama/qwen3:4b-instruct`
- Code: `ollama/qwen2.5-coder:7b`
- Fast fallback: `ollama/llama3.2:3b`

Do not silently switch to hosted models. If local mode is not enough, say what failed and why.

## Proof

- `clawdeck drill` checks config, gateway, Ollama, and pulled model weights.
- `clawdeck smoke` runs an actual local model reply through Ollama and, when available, OpenClaw inference.
- `clawdeck audit` writes the shareable cockpit report.

## Codex Handoff

If this folder is opened in Codex Mac app, use this file as the local-mode contract. Codex can still do cloud work; Clawdeck keeps the local OpenClaw/Ollama path explicit instead of pretending every task should stay offline.
