import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { formatSmokeCli, runSmoke } from "../src/smoke.js";

test("smoke runs Ollama and OpenClaw local checks against the primary model", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-smoke-"));
  const cwd = path.join(root, "workspace");
  await fs.mkdir(path.join(cwd, ".openclaw"), { recursive: true });
  await fs.writeFile(path.join(cwd, ".openclaw", "openclaw.template.json"), JSON.stringify({
    agents: {
      defaults: {
        model: {
          primary: "ollama/test-model"
        }
      }
    }
  }));
  const calls = [];
  const result = await runSmoke({
    cwd,
    runner(command, args) {
      calls.push([command, ...args]);
      return { status: 0, stdout: "ok\n", stderr: "" };
    }
  });

  assert.equal(result.status, "pass");
  assert.deepEqual(calls[0], ["ollama", "run", "test-model", "Reply with exactly: ok"]);
  assert.deepEqual(calls[1], ["openclaw", "infer", "model", "run", "--model", "ollama/test-model", "--prompt", "Reply with exactly: ok"]);
  assert.match(formatSmokeCli(result), /PASS Ollama model reply/);
});
