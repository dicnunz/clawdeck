import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initWorkspace } from "../src/init.js";

test("init scaffolds a local-model OpenClaw workspace", async () => {
  const target = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-local-"));
  const result = await initWorkspace({ targetDir: target, name: "local-test" });
  const config = await fs.readFile(path.join(target, ".openclaw", "openclaw.template.json"), "utf8");

  assert.ok(result.created.includes("OFFLINE.md"));
  assert.ok(result.created.includes("CLAWDECK.md"));
  assert.match(await fs.readFile(path.join(target, "AGENTS.md"), "utf8"), /local-model-first by default/);
  assert.equal(/openai|anthropic|gemini|claude|gpt-/i.test(config), false);
  assert.equal(/"codex"/i.test(config), false);
  assert.match(config, /ollama\/qwen3:4b-instruct/);

  const parsed = JSON.parse(config);
  const aliases = Object.keys(parsed.agents.defaults.models)
    .filter((model) => model.startsWith("ollama/"))
    .map((model) => model.slice("ollama/".length));
  const providerModels = parsed.models.providers.ollama.models.map((model) => model.id);
  assert.deepEqual(new Set(providerModels), new Set(aliases));
});
