import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { redactText } from "./sanitize.js";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_FILE = path.join(SOURCE_ROOT, "templates", ".openclaw", "openclaw.template.json");

export async function applyLocalProfile({
  home = os.homedir(),
  workspace = process.cwd(),
  yes = false,
  now = new Date()
} = {}) {
  const config = JSON.parse(await fs.readFile(TEMPLATE_FILE, "utf8"));
  const resolvedWorkspace = path.resolve(workspace);
  config.agents.defaults.workspace = resolvedWorkspace;

  const openclawDir = path.join(home, ".openclaw");
  const target = path.join(openclawDir, "openclaw.json");
  const backup = path.join(openclawDir, `openclaw.json.backup-${stamp(now)}`);
  const existing = await exists(target);
  const existingConfig = existing ? await readJson(target) : null;
  const nextConfig = mergeLocalProfile(existingConfig, config);
  const modelCommands = pullCommands(config);
  const plan = {
    target: redactText(target, home),
    backup: existing ? redactText(backup, home) : null,
    workspace: displayPath(resolvedWorkspace, home),
    modelCommands
  };

  if (!yes) {
    return {
      applied: false,
      plan,
      message: "Dry run only. Re-run with --yes to write ~/.openclaw/openclaw.json."
    };
  }

  await fs.mkdir(openclawDir, { recursive: true });
  if (existing) {
    await fs.copyFile(target, backup);
  }
  await fs.writeFile(target, `${JSON.stringify(nextConfig, null, 2)}\n`, { mode: 0o600 });

  return {
    applied: true,
    plan,
    message: "Applied local-model OpenClaw profile."
  };
}

export function formatApplyCli(result) {
  const lines = [
    result.message,
    `Target: ${result.plan.target}`,
    `Workspace: ${result.plan.workspace}`
  ];

  if (result.plan.backup) {
    lines.push(`Backup: ${result.plan.backup}`);
  }

  lines.push("", "Pull these models before going offline:");
  for (const command of result.plan.modelCommands) {
    lines.push(`- ${command}`);
  }

  if (!result.applied) {
    lines.push("", "No files changed.");
  } else {
    lines.push("", "Next: run `clawdeck audit`.");
  }

  return `${lines.join("\n")}\n`;
}

function pullCommands(config) {
  const ids = config.models.providers.ollama.models.map((model) => model.id);
  const aliases = Object.keys(config.agents.defaults.models)
    .filter((model) => model.startsWith("ollama/"))
    .map((model) => model.slice("ollama/".length));
  return [...new Set([...ids, ...aliases])].map((model) => `ollama pull ${model}`);
}

function mergeLocalProfile(existing, localProfile) {
  if (!existing || typeof existing !== "object") return localProfile;

  return {
    ...existing,
    agents: {
      ...(existing.agents ?? {}),
      defaults: {
        ...(existing.agents?.defaults ?? {}),
        ...localProfile.agents.defaults
      }
    },
    models: {
      ...(existing.models ?? {}),
      providers: {
        ...(existing.models?.providers ?? {}),
        ...localProfile.models.providers
      }
    },
    tools: {
      ...(existing.tools ?? {}),
      ...localProfile.tools
    },
    plugins: {
      ...(existing.plugins ?? {}),
      entries: {
        ...(existing.plugins?.entries ?? {}),
        ...localProfile.plugins.entries
      }
    }
  };
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

function stamp(date) {
  return date.toISOString().replaceAll(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function displayPath(file, home) {
  const relative = path.relative(process.cwd(), file);
  if (relative && !relative.startsWith("..")) return relative;
  return redactText(file, home);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
