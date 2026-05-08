import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { formatSetupCli, runSetup } from "../src/setup.js";

test("setup adopts and drills without writing config unless --yes is passed", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-setup-dry-"));
  const home = path.join(root, "home");
  const workspace = path.join(root, "workspace");
  const configPath = path.join(home, ".openclaw", "openclaw.json");
  await fs.mkdir(path.join(home, ".openclaw"), { recursive: true });
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "# Existing Rules\n");
  const originalConfig = {
    agents: {
      defaults: {
        workspace,
        model: {
          primary: "openai-codex/gpt-5.5"
        },
        models: {
          "openai-codex/gpt-5.5": {}
        }
      }
    }
  };
  await fs.writeFile(configPath, JSON.stringify(originalConfig, null, 2));

  const result = await runSetup({ home });
  const rendered = formatSetupCli(result);
  const after = JSON.parse(await fs.readFile(configPath, "utf8"));

  assert.equal(result.status, "dry-run");
  assert.equal(result.applied.applied, false);
  assert.deepEqual(after, originalConfig);
  assert.match(rendered, /Clawdeck setup: dry-run/);
  assert.match(rendered, /Next:\n- clawdeck setup --yes/);
  assert.match(await fs.readFile(path.join(workspace, "AGENTS.md"), "utf8"), /CLAWDECK:BEGIN/);
  await fs.access(path.join(workspace, "CLAWDECK.md"));
});

test("setup --yes writes the local profile with a backup and one next action", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-setup-yes-"));
  const home = path.join(root, "home");
  const workspace = path.join(root, "workspace");
  const configPath = path.join(home, ".openclaw", "openclaw.json");
  await fs.mkdir(path.join(home, ".openclaw"), { recursive: true });
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify({
    auth: {
      profiles: {
        openai: {
          token: "keep-me"
        }
      }
    },
    agents: {
      defaults: {
        workspace,
        model: {
          primary: "openai-codex/gpt-5.5"
        },
        models: {
          "openai-codex/gpt-5.5": {}
        }
      }
    }
  }, null, 2));

  const result = await runSetup({ home, yes: true });
  const rendered = formatSetupCli(result);
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  const backups = (await fs.readdir(path.join(home, ".openclaw"))).filter((file) => file.startsWith("openclaw.json.backup-"));

  assert.equal(result.applied.applied, true);
  assert.equal(config.agents.defaults.workspace, workspace);
  assert.equal(config.agents.defaults.model.primary, "ollama/qwen3:4b-instruct");
  assert.equal(config.auth.profiles.openai.token, "keep-me");
  assert.equal(backups.length, 1);
  assert.match(rendered, /Config: applied/);
  assert.match(rendered, /OpenClaw config written with backup/);
  assert.match(rendered, /Next:\n- /);
});
