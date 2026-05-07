# Security Notes

Clawdeck is designed to make a private OpenClaw setup publishable without publishing the private parts.

## What Snapshot Redacts

- keys containing `auth`
- keys containing `token`
- keys containing `secret`
- keys containing `password`
- keys containing `credential`
- keys containing `cookie`
- keys containing `session`
- keys containing `oauth`
- keys containing `apiKey` or `api_key`
- email addresses
- the current home directory path

## What It Does Not Read

- `~/.openclaw/agents`
- `~/.openclaw/tasks`
- browser profiles
- OAuth profile files
- memory databases
- transcripts

## Rule

Use `clawdeck audit` or `clawdeck snapshot` for public sharing. Do not paste raw `~/.openclaw/openclaw.json` into issues, posts, READMEs, or demos.

The audit output is designed to be shareable, but still review it before posting. It intentionally reports readiness, local model names, gateway status, hosted-fallback presence, and missing setup steps; it does not include auth state, transcripts, task databases, browser profiles, or private memory.

`clawdeck apply --yes` backs up `~/.openclaw/openclaw.json` before writing. It changes the active default model path to Ollama while preserving existing providers, plugins, gateway, auth, and meta settings so a real OpenClaw setup is not casually erased.
