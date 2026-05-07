import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { adoptWorkspace, formatAdoptCli } from "../src/adopt.js";

test("adopt overlays Clawdeck into an existing OpenClaw workspace", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-adopt-"));
  const home = path.join(root, "home");
  const workspace = path.join(root, "existing-workspace");
  await fs.mkdir(path.join(home, ".openclaw"), { recursive: true });
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "# Existing Rules\n");
  await fs.writeFile(path.join(home, ".openclaw", "openclaw.json"), JSON.stringify({
    agents: {
      defaults: {
        workspace
      }
    }
  }));

  const result = await adoptWorkspace({ home });
  const agents = await fs.readFile(path.join(workspace, "AGENTS.md"), "utf8");

  assert.equal(result.workspace, workspace);
  assert.ok(result.created.includes("CLAWDECK.md"));
  assert.ok(result.skipped.includes("AGENTS.md"));
  assert.match(agents, /# Existing Rules/);
  assert.match(agents, /CLAWDECK:BEGIN/);
  assert.match(await fs.readFile(path.join(workspace, "CLAWDECK.md"), "utf8"), /Daily Loop/);
  assert.match(formatAdoptCli(result), /clawdeck smoke/);
});
