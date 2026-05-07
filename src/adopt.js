import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initWorkspace } from "./init.js";
import { redactText } from "./sanitize.js";

const AGENTS_MARKER_START = "<!-- CLAWDECK:BEGIN -->";
const AGENTS_MARKER_END = "<!-- CLAWDECK:END -->";

export async function adoptWorkspace({
  workspace,
  home = os.homedir(),
  name,
  force = false,
  linkAgents = true
} = {}) {
  const detected = await detectWorkspace({ home, workspace });
  const result = await initWorkspace({
    targetDir: detected.workspace,
    name: name ?? path.basename(detected.workspace),
    force,
    skipExisting: !force
  });
  const agentLink = linkAgents ? await upsertAgentsLink(detected.workspace) : null;

  return {
    workspace: detected.workspace,
    displayWorkspace: displayPath(detected.workspace, home),
    source: detected.source,
    configPath: detected.configPath,
    created: result.created,
    skipped: result.skipped,
    agentLink,
    next: `clawdeck apply --workspace ${quotePath(displayPath(detected.workspace, home))} --yes`
  };
}

export function formatAdoptCli(result) {
  const lines = [
    "Adopted existing local workspace.",
    `Workspace: ${result.displayWorkspace ?? result.workspace}`,
    `Detected from: ${result.source}`
  ];

  if (result.created.length > 0) {
    lines.push("", "Created:");
    for (const file of result.created) lines.push(`- ${file}`);
  }

  if (result.skipped.length > 0) {
    lines.push("", `Kept existing files: ${result.skipped.length}`);
  }

  if (result.agentLink) {
    lines.push("", `${result.agentLink.action}: AGENTS.md local-mode pointer`);
  }

  lines.push("", "Next:");
  lines.push(`- ${result.next}`);
  lines.push("- clawdeck drill");
  lines.push("- clawdeck smoke");

  return `${lines.join("\n")}\n`;
}

async function detectWorkspace({ home, workspace }) {
  if (workspace) {
    return {
      workspace: path.resolve(workspace),
      source: "argument",
      configPath: path.join(home, ".openclaw", "openclaw.json")
    };
  }

  const configPath = path.join(home, ".openclaw", "openclaw.json");
  const config = await readJson(configPath);
  const configured = config?.agents?.defaults?.workspace;
  if (typeof configured === "string" && configured.trim()) {
    return {
      workspace: path.resolve(configured),
      source: redactText(configPath, home),
      configPath
    };
  }

  return {
    workspace: path.join(home, ".openclaw", "workspace"),
    source: "default-openclaw-workspace",
    configPath
  };
}

async function upsertAgentsLink(workspace) {
  const file = path.join(workspace, "AGENTS.md");
  const block = [
    AGENTS_MARKER_START,
    "## Clawdeck Local Mode",
    "",
    "Read `CLAWDECK.md` before local/offline work. Prefer the Ollama/OpenClaw local path when `clawdeck drill` and `clawdeck smoke` pass; name the blocker instead of silently switching to hosted models.",
    AGENTS_MARKER_END
  ].join("\n");

  let existing = "";
  let existed = true;
  try {
    existing = await fs.readFile(file, "utf8");
  } catch {
    existed = false;
  }

  const next = existing.includes(AGENTS_MARKER_START)
    ? existing.replace(new RegExp(`${escapeRegExp(AGENTS_MARKER_START)}[\\s\\S]*?${escapeRegExp(AGENTS_MARKER_END)}`), block)
    : `${existing.trimEnd()}${existing.trim() ? "\n\n" : ""}${block}\n`;

  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, next);
  return { action: existed ? "Updated" : "Created", file };
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

function displayPath(file, home) {
  const relative = path.relative(process.cwd(), file);
  if (relative && !relative.startsWith("..")) return relative;
  return redactText(file, home);
}

function quotePath(file) {
  return /\s/.test(file) ? JSON.stringify(file) : file;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
