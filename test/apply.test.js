import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyLocalProfile, formatApplyCli } from "../src/apply.js";

test("apply dry run does not write OpenClaw config", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-apply-dry-"));
  const home = path.join(root, "home");
  const workspace = path.join(root, "workspace");
  const result = await applyLocalProfile({ home, workspace, yes: false });

  assert.equal(result.applied, false);
  assert.match(formatApplyCli(result), /No files changed/);
  await assert.rejects(fs.access(path.join(home, ".openclaw", "openclaw.json")));
});

test("apply writes local-only config and backs up existing config", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-apply-"));
  const home = path.join(root, "home");
  const workspace = path.join(root, "workspace");
  const openclawDir = path.join(home, ".openclaw");
  await fs.mkdir(openclawDir, { recursive: true });
  await fs.writeFile(path.join(openclawDir, "openclaw.json"), JSON.stringify({
    gateway: {
      port: 18789
    },
    auth: {
      mode: "local"
    },
    models: {
      providers: {
        openai: {
          enabled: true
        }
      }
    },
    plugins: {
      entries: {
        openai: {
          enabled: true
        }
      }
    },
    agents: {
      defaults: {
        models: {
          "openai-codex/gpt-5.5": {}
        }
      }
    }
  }));

  const result = await applyLocalProfile({
    home,
    workspace,
    yes: true,
    now: new Date("2026-05-07T00:00:00.000Z")
  });
  const config = await fs.readFile(path.join(openclawDir, "openclaw.json"), "utf8");

  assert.equal(result.applied, true);
  assert.match(config, /ollama\/qwen3:4b-instruct/);
  assert.equal(/openai|anthropic|gemini|claude|gpt-/i.test(config), false);
  assert.equal(JSON.parse(config).agents.defaults.workspace, workspace);
  assert.equal(JSON.parse(config).gateway.port, 18789);
  assert.equal(JSON.parse(config).auth.mode, "local");
  assert.deepEqual(Object.keys(JSON.parse(config).models.providers), ["ollama"]);
  assert.equal(JSON.parse(config).plugins.entries.openai, undefined);
  await fs.access(path.join(openclawDir, "openclaw.json.backup-20260507T000000Z"));
});
