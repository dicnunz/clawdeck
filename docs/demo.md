# Demo Script

Use this for a short screen recording or launch thread.

```bash
git clone https://github.com/dicnunz/clawdeck
cd clawdeck
npm link
clawdeck local ../my-local-codex
cd ../my-local-codex
clawdeck apply --workspace . --yes
clawdeck audit
clawdeck drill
```

Show the offline contract and score:

```bash
sed -n '1,120p' OFFLINE.md
open clawdeck.report.html
sed -n '1,120p' clawdeck.report.md
clawdeck drill
```

Then show the generated config has no hosted model fallback:

```bash
! rg "openai|anthropic|gemini|claude|gpt-" .openclaw/openclaw.template.json
```

The point is simple: make OpenClaw feel like Codex while staying local-only once the app and model weights are installed.
