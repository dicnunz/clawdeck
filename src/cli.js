import fs from "node:fs/promises";
import path from "node:path";
import { initWorkspace } from "./init.js";
import { runDoctor } from "./doctor.js";
import { writeSnapshot } from "./snapshot.js";
import { renderAuditCli, renderDrillCli, runAudit } from "./audit.js";
import { applyLocalProfile, formatApplyCli } from "./apply.js";
import { adoptWorkspace, formatAdoptCli } from "./adopt.js";
import { formatSmokeCli, runSmoke } from "./smoke.js";
import { buildHandoff, formatHandoffCli } from "./handoff.js";

const HELP = `clawdeck

Usage:
  clawdeck adopt [workspace] [--home dir] [--name name] [--force] [--no-agents-link]
  clawdeck local [dir] [--name name] [--force]
  clawdeck apply [--workspace dir] [--home dir] [--yes]
  clawdeck init [dir] [--name name] [--force]
  clawdeck audit [--out report.md] [--html report.html] [--json audit.json] [--card card.svg] [--no-write]
  clawdeck drill
  clawdeck smoke [--model ollama/name] [--home dir] [--timeout ms] [--no-openclaw]
  clawdeck handoff [--home dir] [--no-checks]
  clawdeck doctor [--json]
  clawdeck snapshot [--out file]
  clawdeck help

Commands:
  adopt    Overlay Clawdeck into an existing OpenClaw/Codex workspace.
  local     Scaffold a new local-model OpenClaw workspace.
  apply     Apply the local-model OpenClaw profile with backup.
  init      Alias for local.
  audit     Score the local agent stack and write a shareable report/card.
  drill     Run the no-wifi readiness gate without writing artifacts.
  smoke     Run an actual local model reply through Ollama and OpenClaw.
  handoff   Print a Codex Mac app local-mode handoff brief.
  doctor    Check Node, OpenClaw, Ollama, gateway, and local config health.
  snapshot  Write a redacted OpenClaw setup snapshot safe to share.
`;

export async function runCli(argv, io = process) {
  const [command = "help", ...rest] = argv;
  const parsed = parseArgs(rest);

  if (command === "help" || command === "--help" || command === "-h") {
    io.stdout.write(HELP);
    return;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    const packagePath = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));
    io.stdout.write(`${pkg.version}\n`);
    return;
  }

  if (command === "adopt") {
    const result = await adoptWorkspace({
      workspace: parsed.positionals[0],
      home: stringFlag(parsed.flags.home),
      name: stringFlag(parsed.flags.name),
      force: Boolean(parsed.flags.force),
      linkAgents: !parsed.flags.no_agents_link
    });
    io.stdout.write(formatAdoptCli(result));
    return;
  }

  if (command === "init" || command === "local") {
    const target = parsed.positionals[0] ?? parsed.flags.dir ?? ".";
    const result = await initWorkspace({
      targetDir: target,
      name: parsed.flags.name,
      force: Boolean(parsed.flags.force)
    });
    io.stdout.write(`Created ${result.created.length} local-mode files in ${path.relative(process.cwd(), result.targetDir) || "."}\n`);
    io.stdout.write("Next: cd into it, run `clawdeck apply --workspace . --yes`, pull the OFFLINE.md models, then run `clawdeck audit`.\n");
    return;
  }

  if (command === "doctor") {
    const report = await runDoctor();
    if (parsed.flags.json) {
      io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    io.stdout.write(formatDoctor(report));
    return;
  }

  if (command === "apply") {
    const result = await applyLocalProfile({
      home: stringFlag(parsed.flags.home),
      workspace: stringFlag(parsed.flags.workspace),
      yes: Boolean(parsed.flags.yes)
    });
    io.stdout.write(formatApplyCli(result));
    return;
  }

  if (command === "audit") {
    const result = await runAudit({
      out: stringFlag(parsed.flags.out),
      htmlOut: stringFlag(parsed.flags.html),
      jsonOut: stringFlag(parsed.flags.json),
      cardOut: stringFlag(parsed.flags.card),
      write: !parsed.flags.no_write
    });
    io.stdout.write(renderAuditCli(result));
    return;
  }

  if (command === "drill") {
    const result = await runAudit({ write: false });
    io.stdout.write(renderDrillCli(result));
    return;
  }

  if (command === "smoke") {
    const result = await runSmoke({
      home: stringFlag(parsed.flags.home),
      model: stringFlag(parsed.flags.model),
      timeout: numberFlag(parsed.flags.timeout) ?? 60000,
      openclaw: !parsed.flags.no_openclaw
    });
    io.stdout.write(formatSmokeCli(result));
    return;
  }

  if (command === "handoff") {
    const result = await buildHandoff({
      home: stringFlag(parsed.flags.home),
      checks: !parsed.flags.no_checks
    });
    io.stdout.write(formatHandoffCli(result));
    return;
  }

  if (command === "snapshot") {
    const out = parsed.flags.out ?? "clawdeck.snapshot.json";
    const result = await writeSnapshot({ out });
    io.stdout.write(`Wrote redacted snapshot: ${result.out}\n`);
    return;
  }

  throw new Error(`unknown command "${command}". Run "clawdeck help".`);
}

function parseArgs(args) {
  const flags = {};
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, rawValue] = arg.slice(2).split("=");
    const key = rawKey.replaceAll("-", "_");
    if (rawValue !== undefined) {
      flags[key] = rawValue;
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
      continue;
    }
    flags[key] = true;
  }

  return { flags, positionals };
}

function stringFlag(value) {
  return typeof value === "string" ? value : undefined;
}

function numberFlag(value) {
  if (typeof value !== "string") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDoctor(report) {
  const lines = [`Clawdeck doctor: ${report.status}`];
  for (const check of report.checks) {
    lines.push(`${check.status.toUpperCase()} ${check.name}: ${check.message}`);
  }
  return `${lines.join("\n")}\n`;
}
