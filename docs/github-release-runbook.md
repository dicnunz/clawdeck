# GitHub Release Runbook

This is the exact public release path for Clawdeck.

Do not run these commands without fresh approval from the repo owner.

## Preconditions

- local branch: `main`
- local tag: `v0.1.0`
- working tree: clean
- GitHub account: `dicnunz`
- target repo: `dicnunz/clawdeck`

## Commands

```bash
gh repo create dicnunz/clawdeck \
  --public \
  --source=. \
  --remote=origin \
  --description "Local-model Codex-feeling OpenClaw setup for Ollama." \
  --push

git push origin v0.1.0

gh repo edit dicnunz/clawdeck \
  --add-topic openclaw \
  --add-topic codex \
  --add-topic ollama \
  --add-topic agents \
  --add-topic local-first \
  --add-topic ai-agent \
  --add-topic agent-audit \
  --add-topic cli \
  --add-topic nodejs

gh release create v0.1.0 \
  --repo dicnunz/clawdeck \
  --title "Clawdeck v0.1.0" \
  --notes-file docs/release-notes/v0.1.0.md
```

## Proof To Capture

```bash
gh repo view dicnunz/clawdeck --json nameWithOwner,visibility,url,description
gh release view v0.1.0 --repo dicnunz/clawdeck --json tagName,url,name
```
