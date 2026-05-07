import fs from "node:fs/promises";
import path from "node:path";
import { initWorkspace } from "./init.js";
import { runDoctor } from "./doctor.js";
import { writeSnapshot } from "./snapshot.js";
import { renderAuditCli, renderDrillCli, runAudit } from "./audit.js";
import { applyLocalProfile, formatApplyCli } from "./apply.js";

const HELP = `clawdeck

Usage:
  clawdeck local [dir] [--name name] [--force]
  clawdeck apply [--workspace dir] [--home dir] [--yes]
  clawdeck init [dir] [--name name] [--force]
  clawdeck audit [--out report.md] [--html report.html] [--json audit.json] [--card card.svg] [--no-write]
  clawdeck drill
  clawdeck doctor [--json]
  clawdeck snapshot [--out file]
  clawdeck help

Commands:
  local     Scaffold a local-only Codex-feeling OpenClaw workspace.
  apply     Apply the local-only OpenClaw profile with backup.
  init      Alias for local.
  audit     Score the local agent stack and write a shareable report/card.
  drill     Run the no-wifi readiness gate without writing artifacts.
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

  if (command === "init" || command === "local") {
    const target = parsed.positionals[0] ?? parsed.flags.dir ?? ".";
    const result = await initWorkspace({
      targetDir: target,
      name: parsed.flags.name,
      force: Boolean(parsed.flags.force)
    });
    io.stdout.write(`Created ${result.created.length} local-only files in ${path.relative(process.cwd(), result.targetDir) || "."}\n`);
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

function formatDoctor(report) {
  const lines = [`Clawdeck doctor: ${report.status}`];
  for (const check of report.checks) {
    lines.push(`${check.status.toUpperCase()} ${check.name}: ${check.message}`);
  }
  return `${lines.join("\n")}\n`;
}
