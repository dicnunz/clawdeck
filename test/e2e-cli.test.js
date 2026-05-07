import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const BIN = path.resolve("bin", "clawdeck.js");

test("CLI adopts, applies, and drills an existing OpenClaw workspace", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-e2e-"));
  const home = path.join(root, "home");
  const workspace = path.join(home, ".openclaw", "workspace with spaces");
  const openclawDir = path.join(home, ".openclaw");
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "# Existing Workspace Rules\n");
  await fs.writeFile(path.join(openclawDir, "openclaw.json"), JSON.stringify(existingOpenClawConfig(workspace), null, 2));

  const adopted = run(["adopt", "--home", home]);
  assert.match(adopted.stdout, /Adopted existing local workspace/);
  assert.match(adopted.stdout, /Workspace: \$HOME\/\.openclaw\/workspace with spaces/);
  assert.match(adopted.stdout, /clawdeck apply --workspace "\$HOME\/\.openclaw\/workspace with spaces" --yes/);
  assert.match(await fs.readFile(path.join(workspace, "AGENTS.md"), "utf8"), /Existing Workspace Rules/);
  assert.match(await fs.readFile(path.join(workspace, "AGENTS.md"), "utf8"), /CLAWDECK:BEGIN/);
  await fs.access(path.join(workspace, "CLAWDECK.md"));

  const applied = run(["apply", "--home", home, "--workspace", workspace, "--yes"]);
  assert.match(applied.stdout, /Applied local-model OpenClaw profile/);
  const nextConfig = JSON.parse(await fs.readFile(path.join(openclawDir, "openclaw.json"), "utf8"));
  assert.equal(nextConfig.agents.defaults.workspace, workspace);
  assert.equal(nextConfig.agents.defaults.model.primary, "ollama/qwen3:4b-instruct");
  assert.equal(nextConfig.models.providers.openai.baseUrl, "https://api.openai.com/v1");
  assert.equal(nextConfig.auth.profiles.openai.mode, "api_key");
  assert.equal(nextConfig.plugins.entries.openai.enabled, true);

  const backups = (await fs.readdir(openclawDir)).filter((file) => file.startsWith("openclaw.json.backup-"));
  assert.equal(backups.length, 1);

  const drilled = run(["drill"], { cwd: workspace, env: { HOME: home } });
  assert.match(drilled.stdout, /Clawdeck offline drill:/);
  assert.match(drilled.stdout, /Workspace contract:/);
  assert.match(drilled.stdout, /Local-model defaults:/);
});

function run(args, { cwd = process.cwd(), env = {} } = {}) {
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  assert.equal(result.status, 0, `${[BIN, ...args].join(" ")}\n${result.stderr}`);
  return result;
}

function existingOpenClawConfig(workspace) {
  return {
    gateway: {
      port: 18789,
      mode: "local"
    },
    auth: {
      profiles: {
        openai: {
          provider: "openai",
          mode: "api_key"
        }
      },
      order: {
        openai: ["openai"]
      }
    },
    models: {
      providers: {
        openai: {
          baseUrl: "https://api.openai.com/v1",
          api: "openai-responses",
          models: [
            {
              id: "gpt-4o-mini",
              name: "GPT 4o mini",
              contextWindow: 128000,
              maxTokens: 4096,
              reasoning: false,
              input: ["text"],
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0
              }
            }
          ]
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
        workspace,
        agentRuntime: {
          id: "auto",
          fallback: "pi"
        },
        models: {
          "openai-codex/gpt-5.5": {}
        },
        model: {
          primary: "openai-codex/gpt-5.5"
        }
      }
    }
  };
}
