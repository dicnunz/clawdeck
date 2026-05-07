# Claim Check

This is the evidence sheet behind Clawdeck's public claims.

## Verified Claims

| Claim | Status | Source |
| --- | --- | --- |
| Codex CLI is a local terminal coding agent, but requires ChatGPT sign-in or an API key for model access. | Supported | OpenAI Codex CLI docs: https://developers.openai.com/codex/cli |
| OpenClaw has a local setup flow with model/auth setup, workspace files, gateway settings, daemon install, and health checks. | Supported | OpenClaw CLI setup reference: https://docs.openclaw.ai/start/wizard-cli-reference |
| OpenClaw supports Ollama and local/self-hosted model providers. | Supported | OpenClaw FAQ: https://docs.openclaw.ai/help/faq |
| OpenClaw's Ollama provider supports local-only mode and local model discovery from an Ollama instance. | Supported | OpenClaw Ollama provider docs: https://github.com/openclaw/openclaw/blob/main/docs/providers/ollama.md |
| Ollama can pull, run, list, and serve local models through its CLI. | Supported | Ollama CLI docs: https://docs.ollama.com/cli |
| Ollama's OpenClaw integration can configure a provider, install/start the gateway daemon, and choose local or cloud models. | Supported | Ollama OpenClaw integration docs: https://docs.ollama.com/integrations/openclaw |

## Narrowed Claims

| Earlier wording | Safer wording |
| --- | --- |
| "offline mode for agent people" | "local-model, no-wifi-after-setup workspace for local file/code work" |
| "free" | "no per-token API bill for the local Ollama path" |
| "Codex offline mode" | "Codex-feeling OpenClaw/Ollama workspace; not Codex-compatible and not an OpenAI product" |
| "normal local-agent work does not need wifi" | "local files, shell, gateway workflows, and already-pulled Ollama models can work without wifi; web/search/account/cloud tasks cannot" |

## Caveats

- Local small models are not equivalent to hosted frontier models for hard reasoning, browser automation, or security-sensitive tool use.
- OpenClaw's own docs recommend strong models and strict sandbox/tool allowlists for tool-enabled agents.
- Ollama web search and cloud models can require sign-in and network access.
- Clawdeck does not install OpenClaw, install Ollama, pull model weights, or start the gateway automatically.
- Clawdeck's `apply` command backs up and writes OpenClaw config, but users should still review the generated config before using it as their long-term setup.
