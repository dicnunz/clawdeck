# OFFLINE.md

This workspace is designed to feel like Codex while keeping the default model path local.

## What Works Without Wifi

- local file reads and edits
- local shell commands
- Ollama-backed model calls
- OpenClaw local inference and gateway workflows that do not depend on external services
- memory/workspace notes on disk
- coding, refactors, summaries, planning, and audits over local files

## What Must Already Be Installed

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
ollama pull qwen3:4b-instruct
ollama pull qwen2.5-coder:7b
ollama pull llama3.2:3b
```

Once those are installed and the model weights are present, the workspace should not need wifi for normal local-agent work.

Local model work has no per-token API bill, but it still uses your hardware and electricity. Optional cloud models, Ollama web search, account auth, and remote APIs are not part of the offline claim.

## Rule

If a task needs the internet, hosted models, account auth, or a remote API, say so. Do not silently switch out of local mode.
