import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runAudit } from "./audit.js";
import { redactText } from "./sanitize.js";

const REQUIRED_FILES = ["CLAWDECK.md", "AGENTS.md", "OFFLINE.md", "TOOLS.md", "USER.md", "HEARTBEAT.md"];

export async function buildHandoff({
  home = os.homedir(),
  cwd = process.cwd(),
  checks = true
} = {}) {
  const workspace = path.resolve(cwd);
  const files = await inspectFiles(workspace);
  const auditResult = checks ? await runAudit({ home, cwd: workspace, write: false }) : null;
  const audit = auditResult?.audit ?? null;

  return {
    workspace: redactText(workspace, home),
    files,
    checks,
    status: audit?.readiness.status ?? "unchecked",
    primaryModel: audit?.summary.primaryModel ?? "unchecked",
    nextAction: audit?.readiness.nextAction ?? "Run `clawdeck drill`.",
    summary: audit?.summary.oneLine ?? "Local readiness checks were skipped.",
    blockedGates: audit?.readiness.gates.filter((gate) => !gate.ok).map((gate) => gate.name) ?? []
  };
}

export function formatHandoffCli(result) {
  const present = result.files.present.length === 0 ? "none" : result.files.present.join(", ");
  const missing = result.files.missing.length === 0 ? "none" : result.files.missing.join(", ");
  const blocked = result.blockedGates.length === 0 ? "none" : result.blockedGates.join(", ");

  const prompt = [
    "You are working in a Clawdeck local-model workspace.",
    `Workspace: ${result.workspace}`,
    "",
    "Read `CLAWDECK.md` and `AGENTS.md` first. Prefer the OpenClaw/Ollama local path when `clawdeck drill` and `clawdeck smoke` pass. Do not silently switch to hosted models; name the blocker and ask before external actions.",
    "",
    `Current drill status: ${result.status}`,
    `Primary local model: ${result.primaryModel}`,
    `Blocked gates: ${blocked}`,
    `Next local command: ${result.nextAction}`
  ].join("\n");

  return [
    "Clawdeck Codex handoff",
    `Workspace: ${result.workspace}`,
    `Status: ${result.status}`,
    `Primary model: ${result.primaryModel}`,
    `Present files: ${present}`,
    `Missing files: ${missing}`,
    "",
    "Paste this into Codex Mac app:",
    "",
    "```text",
    prompt,
    "```",
    ""
  ].join("\n");
}

async function inspectFiles(workspace) {
  const present = [];
  const missing = [];

  for (const file of REQUIRED_FILES) {
    try {
      await fs.access(path.join(workspace, file));
      present.push(file);
    } catch {
      missing.push(file);
    }
  }

  return { present, missing };
}
