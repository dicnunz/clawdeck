# Demo Script

Use this for a short screen recording or launch thread.

```bash
git clone https://github.com/dicnunz/clawdeck
cd clawdeck
npm link
clawdeck adopt
clawdeck apply --yes
clawdeck drill
clawdeck smoke
clawdeck handoff
clawdeck audit
open clawdeck.report.html
```

Show the local-mode contract:

```bash
sed -n '1,160p' ~/.openclaw/workspace/CLAWDECK.md
```

Show that the generated active defaults have no hosted fallback:

```bash
! rg "openai|anthropic|gemini|claude|gpt-" ~/.openclaw/workspace/.openclaw/openclaw.template.json
```

The point is simple: local models become a verified mode inside the OpenClaw/Codex workspace you already use.
