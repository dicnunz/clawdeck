# GitHub Release Runbook

This is the exact public release path for Clawdeck.

Do not run these commands without fresh approval from the repo owner.

## Preconditions

- local branch: `main`
- working tree: clean
- GitHub account: `dicnunz`
- GitHub repo: `dicnunz/clawdeck` already exists and is public
- release version: `v0.1.5`
- npm package: `@nicdunz/clawdeck`
- local verification: `npm run verify`

## Commands

```bash
npm run verify

git push origin main
git tag v0.1.5
git push origin v0.1.5

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

gh release create v0.1.5 \
  --repo dicnunz/clawdeck \
  --title "Clawdeck v0.1.5" \
  --notes-file docs/release-notes/v0.1.5.md

npm publish --access public
```

## Proof To Capture

```bash
gh repo view dicnunz/clawdeck --json nameWithOwner,visibility,url,description
gh release view v0.1.5 --repo dicnunz/clawdeck --json tagName,url,name
npm view @nicdunz/clawdeck version
npx @nicdunz/clawdeck help
```
