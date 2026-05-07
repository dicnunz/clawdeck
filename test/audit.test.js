import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { renderAuditCli, renderDrillCli, runAudit } from "../src/audit.js";
import { initWorkspace } from "../src/init.js";

test("audit can run without writing artifacts or leaking the supplied home path", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-audit-"));
  const home = path.join(root, "home");
  const cwd = path.join(root, "workspace");
  await fs.mkdir(home, { recursive: true });
  await fs.mkdir(cwd, { recursive: true });

  const result = await runAudit({ home, cwd, write: false });
  const rendered = renderAuditCli(result);

  assert.match(rendered, /Clawdeck audit: \d+\/100/);
  assert.match(rendered, /Offline drill:/);
  assert.equal(Object.keys(result.outputs).length, 0);
  assert.equal(JSON.stringify(result.audit).includes(home), false);
  assert.equal(result.audit.readiness.status, "blocked");
  assert.equal(result.audit.readiness.gates.some((gate) => gate.name === "Local-only profile"), true);
  assert.match(renderDrillCli(result), /Clawdeck offline drill:/);
});

test("audit prefers workspace local-only template over home OpenClaw config", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-audit-template-"));
  const home = path.join(root, "home");
  const cwd = path.join(root, "workspace");
  await fs.mkdir(path.join(home, ".openclaw"), { recursive: true });
  await fs.writeFile(path.join(home, ".openclaw", "openclaw.json"), JSON.stringify({
    agents: {
      defaults: {
        models: {
          "openai-codex/gpt-5.5": {}
        },
        model: {
          primary: "openai-codex/gpt-5.5"
        }
      }
    }
  }));
  await initWorkspace({ targetDir: cwd, name: "offline" });

  const result = await runAudit({ home, cwd, write: false });

  assert.equal(result.audit.checks.openclawConfig.source, "workspace-template");
  assert.equal(result.audit.checks.localOnly.ok, true);
  assert.equal(result.audit.summary.cloudFallback, "none");
  assert.equal(result.audit.readiness.gates.find((gate) => gate.name === "Local-only profile").ok, true);
});

test("audit creates output directories", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-audit-out-"));
  const home = path.join(root, "home");
  const cwd = path.join(root, "workspace");
  await fs.mkdir(home, { recursive: true });
  await initWorkspace({ targetDir: cwd, name: "offline" });

  const result = await runAudit({
    home,
    cwd,
    out: path.join(root, "nested", "report.md"),
    htmlOut: path.join(root, "nested", "report.html"),
    jsonOut: path.join(root, "nested", "audit.json"),
    cardOut: path.join(root, "nested", "card.svg")
  });

  assert.equal(result.outputs.report.endsWith("nested/report.md"), true);
  assert.match(await fs.readFile(path.join(root, "nested", "report.html"), "utf8"), /Offline drill/);
  assert.match(await fs.readFile(path.join(root, "nested", "report.html"), "utf8"), /Configured models/);
  await fs.access(path.join(root, "nested", "report.md"));
  await fs.access(path.join(root, "nested", "report.html"));
  await fs.access(path.join(root, "nested", "audit.json"));
  await fs.access(path.join(root, "nested", "card.svg"));
});
