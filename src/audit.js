import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runDoctor } from "./doctor.js";
import { buildSnapshot, redactText } from "./sanitize.js";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REPORT = "clawdeck.report.md";
const DEFAULT_HTML = "clawdeck.report.html";
const DEFAULT_JSON = "clawdeck.audit.json";
const DEFAULT_CARD = "clawdeck.card.svg";

export async function runAudit({
  out = DEFAULT_REPORT,
  htmlOut = DEFAULT_HTML,
  jsonOut = DEFAULT_JSON,
  cardOut = DEFAULT_CARD,
  write = true,
  home = os.homedir(),
  cwd = process.cwd()
} = {}) {
  const doctor = redactDoctor(await runDoctor({ home }), home);
  const config = await readOpenClawConfig({ home, cwd });
  const configuredLocalModels = config.ok ? extractConfiguredLocalModels(config.value) : [];
  const ollama = readOllamaModels(configuredLocalModels);
  const workspace = await inspectWorkspace(cwd);
  const localOnly = inspectLocalOnly(config);
  const score = scoreAudit({ doctor, config, ollama, workspace, localOnly });
  const readiness = buildReadiness({ doctor, config, ollama, workspace, localOnly });
  const fixes = buildFixes({ doctor, config, ollama, workspace, localOnly, readiness });
  const snapshot = config.ok ? buildSnapshot(config.value, { home }) : null;

  const audit = {
    schemaVersion: "clawdeck.audit.v1",
    generatedAt: new Date().toISOString(),
    score,
    summary: buildSummary({ doctor, config, ollama, workspace, readiness }),
    checks: {
      doctor,
      localOnly,
      openclawConfig: config.ok ? summarizeConfig(config, home) : { ok: false, message: config.message },
      ollama,
      workspace
    },
    readiness,
    fixes,
    snapshot
  };

  const outputs = {};
  if (write) {
    outputs.report = path.resolve(out);
    outputs.html = path.resolve(htmlOut);
    outputs.json = path.resolve(jsonOut);
    outputs.card = path.resolve(cardOut);
    await Promise.all(Object.values(outputs).map((file) => fs.mkdir(path.dirname(file), { recursive: true })));
    await fs.writeFile(outputs.report, renderMarkdown(audit));
    await fs.writeFile(outputs.html, renderHtml(audit));
    await fs.writeFile(outputs.json, `${JSON.stringify(audit, null, 2)}\n`);
    await fs.writeFile(outputs.card, renderCard(audit));
  }

  return { audit, outputs };
}

export function renderAuditCli({ audit, outputs = {} }) {
  const lines = [
    `Clawdeck audit: ${audit.score.points}/100 (${audit.score.label})`,
    audit.summary.oneLine,
    `Offline drill: ${audit.readiness.status} - ${audit.readiness.nextAction}`,
    ""
  ];

  if (audit.fixes.length > 0) {
    lines.push("Top fixes:");
    for (const fix of audit.fixes.slice(0, 3)) {
      lines.push(`- ${fix.title}: ${fix.command}`);
    }
    lines.push("");
  }

  if (Object.keys(outputs).length > 0) {
    lines.push("Wrote:");
    for (const [kind, file] of Object.entries(outputs)) {
      lines.push(`- ${kind}: ${displayPath(file)}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderDrillCli({ audit }) {
  const lines = [
    `Clawdeck offline drill: ${audit.readiness.status}`,
    audit.summary.oneLine,
    ""
  ];

  for (const gate of audit.readiness.gates) {
    lines.push(`${gate.ok ? "READY" : "BLOCKED"} ${gate.name}: ${gate.detail}`);
  }

  lines.push("", `Next: ${audit.readiness.nextAction}`);

  return `${lines.join("\n")}\n`;
}

function scoreAudit({ doctor, config, ollama, workspace, localOnly }) {
  const items = [
    points("Node >=20", statusOf(doctor, "Node") === "pass", 8),
    points("OpenClaw CLI", statusOf(doctor, "OpenClaw CLI") === "pass", 12),
    points("OpenClaw config", config.ok, 14),
    points("Local-model defaults", localOnly.ok, 12),
    points("OpenClaw gateway", statusOf(doctor, "Gateway") === "pass", 14),
    points("Ollama reachable", ollama.ok, 14),
    points("Local models installed", ollama.localConfiguredInstalled > 0, 12),
    points("Agent workspace files", workspace.score >= 4, 8),
    points("Safe share artifacts", true, 6)
  ];

  const total = items.reduce((sum, item) => sum + item.earned, 0);
  return {
    points: total,
    max: 100,
    label: label(total),
    items
  };
}

function buildSummary({ doctor, config, ollama, workspace, readiness }) {
  const primary = config.ok ? config.value?.agents?.defaults?.model?.primary ?? "unset" : "unset";
  const modelCount = ollama.ok ? ollama.models.length : 0;
  const gateway = statusOf(doctor, "Gateway");
  const localOnly = inspectLocalOnly(config);
  const cloud = localOnly.cloudModels.length === 0 ? "none" : localOnly.cloudModels.length;
  const oneLine = `Local agent stack: primary=${primary}, ollamaModels=${modelCount}, gateway=${gateway}, workspaceFiles=${workspace.score}/${workspace.max}, activeHostedFallback=${cloud}.`;

  return {
    oneLine,
    primaryModel: primary,
    ollamaModelCount: modelCount,
    gatewayStatus: gateway,
    activeHostedFallback: cloud,
    offlineStatus: readiness.status,
    nextAction: readiness.nextAction
  };
}

function buildReadiness({ doctor, config, ollama, workspace, localOnly }) {
  const installedCount = ollama.localConfiguredInstalled ?? 0;
  const configuredCount = ollama.configured?.length ?? installedCount + (ollama.localConfiguredMissing?.length ?? 0);
  const openclawStatus = statusOf(doctor, "OpenClaw CLI");
  const gatewayStatus = statusOf(doctor, "Gateway");
  const workspaceCommand = workspace.sourceCheckout ? "clawdeck adopt" : "clawdeck adopt .";
  const workspaceDetail = workspace.sourceCheckout
    ? "source checkout detected; adopt an OpenClaw workspace instead"
    : `${workspace.score}/${workspace.max} command-center files present`;
  const gates = [
    {
      name: "Workspace contract",
      ok: workspace.score === workspace.max,
      detail: workspaceDetail,
      command: workspaceCommand
    },
    {
      name: "Local-model defaults",
      ok: config.ok && localOnly.ok,
      detail: config.ok ? localOnly.message : config.message,
      command: "clawdeck apply --workspace . --yes"
    },
    {
      name: "Ollama reachable",
      ok: ollama.ok,
      detail: ollama.message,
      command: "ollama serve"
    },
    {
      name: "Configured model weights",
      ok: ollama.ok && configuredCount > 0 && ollama.localConfiguredMissing.length === 0,
      detail: `${installedCount}/${configuredCount} configured models installed`,
      command: ollama.localConfiguredMissing.length > 0 ? `ollama pull ${ollama.localConfiguredMissing[0]}` : "ollama list"
    },
    {
      name: "OpenClaw CLI",
      ok: openclawStatus === "pass",
      detail: `doctor=${openclawStatus}`,
      command: "npm install -g openclaw@latest && openclaw onboard --install-daemon"
    },
    {
      name: "OpenClaw gateway",
      ok: gatewayStatus === "pass",
      detail: `doctor=${gatewayStatus}`,
      command: "openclaw gateway start && openclaw gateway status --json"
    }
  ];
  const firstBlocked = gates.find((gate) => !gate.ok);

  return {
    status: firstBlocked ? "blocked" : "ready",
    gates,
    nextAction: firstBlocked?.command ?? "Go offline and run OpenClaw from this workspace."
  };
}

function buildFixes({ doctor, config, ollama, workspace, localOnly, readiness }) {
  const fixes = [];

  if (statusOf(doctor, "OpenClaw CLI") !== "pass") {
    fixes.push({
      title: "Install OpenClaw",
      command: "npm install -g openclaw@latest && openclaw onboard --install-daemon",
      why: "The CLI and daemon are required for a live OpenClaw command center."
    });
  }

  if (!config.ok) {
    fixes.push({
      title: "Create OpenClaw config",
      command: "openclaw onboard --install-daemon",
      why: "No valid ~/.openclaw/openclaw.json was found."
    });
  }

  if (config.ok && !localOnly.ok) {
    fixes.push({
      title: "Remove hosted model fallback",
      command: "clawdeck apply --workspace . --yes",
      why: `The current OpenClaw config references hosted models: ${localOnly.cloudModels.join(", ")}.`
    });
  }

  if (statusOf(doctor, "Gateway") !== "pass" && statusOf(doctor, "OpenClaw CLI") === "pass") {
    fixes.push({
      title: "Start or repair the OpenClaw gateway",
      command: "openclaw gateway start && openclaw gateway status --json",
      why: "The local control surface is not clearly reachable."
    });
  }

  if (!ollama.ok) {
    fixes.push({
      title: "Install and start Ollama",
      command: "ollama serve",
      why: "Local-first agents need a reachable local model server."
    });
  } else if (ollama.localConfiguredMissing.length > 0) {
    fixes.push({
      title: "Pull configured local models",
      command: `ollama pull ${ollama.localConfiguredMissing[0]}`,
      why: "Your config references local models that are not installed."
    });
  }

  if (workspace.missing.length > 0) {
    fixes.push({
      title: workspace.sourceCheckout ? "Adopt an OpenClaw workspace" : "Adopt this workspace",
      command: workspace.sourceCheckout ? "clawdeck adopt" : "clawdeck adopt .",
      why: workspace.sourceCheckout
        ? "This is the Clawdeck source repo. Run adoption against the OpenClaw workspace you actually use."
        : "The command-center files make the setup portable and understandable."
    });
  }

  if (fixes.length === 0 && readiness.status !== "ready") {
    fixes.push({
      title: "Clear offline drill",
      command: readiness.nextAction,
      why: "The readiness drill still has a blocked local-model gate."
    });
  }

  return fixes;
}

function renderMarkdown(audit) {
  const lines = [
    "# Clawdeck Audit",
    "",
    `Score: ${audit.score.points}/100 (${audit.score.label})`,
    "",
    audit.summary.oneLine,
    "",
    "## Scorecard",
    "",
    "| Check | Score |",
    "| --- | --- |"
  ];

  for (const item of audit.score.items) {
    lines.push(`| ${item.name} | ${item.earned}/${item.max} |`);
  }

  lines.push("", "## Top Fixes", "");
  if (audit.fixes.length === 0) {
    lines.push("No obvious fixes. This stack is ready to show.");
  } else {
    for (const fix of audit.fixes) {
      lines.push(`- ${fix.title}: \`${fix.command}\``);
    }
  }

  lines.push(
    "",
    "## Offline Drill",
    "",
    `Status: **${audit.readiness.status}**`,
    "",
    "| Gate | Result | Detail |",
    "| --- | --- | --- |"
  );

  for (const gate of audit.readiness.gates) {
    lines.push(`| ${gate.name} | ${gate.ok ? "ready" : "blocked"} | ${gate.detail} |`);
  }

  lines.push(
    "",
    "## Shareable Summary",
    "",
    "```text",
    `Clawdeck score: ${audit.score.points}/100`,
    audit.summary.oneLine,
    "```",
    "",
    "## Privacy",
    "",
    "This report uses redacted paths and public setup metadata. It does not include OAuth files, sessions, task databases, browser state, or private memory.",
    ""
  );

  return lines.join("\n");
}

function renderHtml(audit) {
  const fixes = audit.fixes.length === 0
    ? "<li class=\"fix\"><strong>No obvious fixes</strong><code>clawdeck drill</code><span>This stack is ready to show.</span></li>"
    : audit.fixes.map((fix) => `<li class="fix"><strong>${escapeXml(fix.title)}</strong><code>${escapeXml(fix.command)}</code><span>${escapeXml(fix.why)}</span></li>`).join("");
  const rows = audit.score.items.map((item) => `<tr><td>${escapeXml(item.name)}</td><td>${item.earned}/${item.max}</td></tr>`).join("");
  const gates = audit.readiness.gates.map((gate) => `<li class="gate ${gate.ok ? "ok" : "blocked"}"><span>${gate.ok ? "Ready" : "Blocked"}</span><strong>${escapeXml(gate.name)}</strong><em>${escapeXml(gate.detail)}</em></li>`).join("");
  const models = audit.checks.ollama.configured.length === 0
    ? "<li>No configured Ollama models found.</li>"
    : audit.checks.ollama.configured.map((model) => {
      const installed = !audit.checks.ollama.localConfiguredMissing.includes(model);
      return `<li><span class="${installed ? "ok-text" : "blocked-text"}">${installed ? "installed" : "missing"}</span>${escapeXml(model)}</li>`;
    }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Clawdeck Audit</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1117; color: #101418; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #0d1117; }
    main { width: min(1120px, 100%); min-height: 100vh; margin: 0 auto; background: #f8fafc; padding: 34px; }
    header { display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: start; padding-bottom: 24px; border-bottom: 1px solid #d9e1ea; }
    h1 { margin: 0 0 10px; font-size: 44px; line-height: 1; }
    .summary { max-width: 720px; margin: 0; color: #344052; font-size: 18px; line-height: 1.45; }
    .badge { display: inline-flex; min-height: 34px; align-items: center; justify-content: center; border: 1px solid #bdd7cc; background: #e8f5ef; color: #0f684f; padding: 0 12px; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: .08em; white-space: nowrap; }
    .badge.blocked { border-color: #f0c6b3; background: #fff0e9; color: #9a3412; }
    .hero { display: grid; grid-template-columns: minmax(260px, 360px) 1fr; gap: 22px; margin: 26px 0; }
    .score { border: 1px solid #d9e1ea; background: #fff; padding: 24px; }
    .score strong { display: block; font-size: 82px; line-height: .9; letter-spacing: 0; }
    .score span { display: block; margin-top: 12px; color: #0f684f; font-size: 22px; font-weight: 800; }
    .next { border: 1px solid #d9e1ea; background: #111827; color: #f8fafc; padding: 24px; }
    .next h2, .panel h2 { margin: 0 0 12px; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; }
    .next code { display: block; margin-top: 12px; padding: 14px; background: #020617; color: #f8fafc; overflow-wrap: anywhere; }
    .grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 22px; }
    .panel { border: 1px solid #d9e1ea; background: #fff; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    td { border-bottom: 1px solid #e5ebf1; padding: 10px 0; font-size: 15px; }
    tr:last-child td { border-bottom: 0; }
    td:last-child { width: 90px; text-align: right; font-weight: 800; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
    .gate { display: grid; grid-template-columns: 76px 1fr; gap: 4px 12px; border-bottom: 1px solid #e5ebf1; padding: 10px 0; }
    .gate:last-child { border-bottom: 0; }
    .gate span { grid-row: span 2; align-self: start; color: #0f684f; font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .gate.blocked span, .blocked-text { color: #b44219; }
    .gate strong { font-size: 15px; }
    .gate em { color: #536171; font-style: normal; font-size: 14px; }
    .fix { border: 1px solid #d9e1ea; padding: 14px; }
    .fix strong { display: block; }
    .fix code { display: block; margin: 10px 0; padding: 10px; background: #111827; color: #f8fafc; overflow-wrap: anywhere; }
    .fix span { color: #536171; }
    .models li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e5ebf1; padding: 8px 0; font-size: 14px; }
    .models li:last-child { border-bottom: 0; }
    .models span { order: 2; font-weight: 800; text-transform: uppercase; font-size: 11px; }
    .ok-text { color: #0f684f; }
    footer { margin-top: 28px; color: #536171; font-size: 13px; }
    @media (max-width: 760px) {
      main { padding: 22px; }
      header, .hero, .grid { grid-template-columns: 1fr; }
      h1 { font-size: 36px; }
      .score strong { font-size: 64px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Clawdeck Audit</h1>
        <p class="summary">${escapeXml(audit.summary.oneLine)}</p>
      </div>
      <div class="badge ${audit.readiness.status === "ready" ? "" : "blocked"}">${escapeXml(audit.readiness.status)}</div>
    </header>
    <section class="hero">
      <div class="score"><strong>${audit.score.points}/100</strong><span>${escapeXml(audit.score.label)}</span></div>
      <div class="next">
        <h2>Next local action</h2>
        <p>${escapeXml(audit.readiness.status === "ready" ? "The offline drill is clear." : "Clear this before going offline.")}</p>
        <code>${escapeXml(audit.readiness.nextAction)}</code>
      </div>
    </section>
    <section class="grid">
      <div class="panel">
        <h2>Offline drill</h2>
        <ul>${gates}</ul>
      </div>
      <div class="panel">
        <h2>Configured models</h2>
        <ul class="models">${models}</ul>
      </div>
      <div class="panel">
        <h2>Scorecard</h2>
        <table>${rows}</table>
      </div>
      <div class="panel">
        <h2>Fixes</h2>
        <ul>${fixes}</ul>
      </div>
    </section>
    <footer>No auth, sessions, browser state, or private memory included.</footer>
  </main>
</body>
</html>
`;
}

function renderCard(audit) {
  const score = audit.score.points;
  const label = escapeXml(audit.score.label);
  const summary = escapeXml(truncate(audit.summary.oneLine, 108));
  const primary = escapeXml(audit.summary.primaryModel ?? "unset");
  const fix = escapeXml(audit.fixes[0]?.title ?? "Ready to show");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Clawdeck audit card">
  <rect width="1200" height="630" fill="#111111"/>
  <rect x="40" y="40" width="1120" height="550" rx="18" fill="#f7f2e8"/>
  <text x="86" y="120" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="42" font-weight="800" fill="#111111">Clawdeck Local Agent Stack</text>
  <text x="86" y="180" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="134" font-weight="900" fill="#111111">${score}/100</text>
  <text x="405" y="162" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="800" fill="#156f5b">${label}</text>
  <text x="405" y="212" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="25" fill="#333333">Primary: ${primary}</text>
  <text x="86" y="300" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="700" fill="#111111">Offline drill: ${escapeXml(audit.readiness.status)}</text>
  <text x="86" y="338" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="24" font-weight="700" fill="#111111">Top fix: ${fix}</text>
  <text x="86" y="370" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="24" fill="#333333">${summary}</text>
  <text x="86" y="520" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="800" fill="#111111">npx @dicnunz/clawdeck adopt</text>
  <text x="86" y="558" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="18" fill="#555555">No auth, sessions, browser state, or private memory included.</text>
</svg>
`;
}

async function readOpenClawConfig({ home, cwd }) {
  const candidates = [
    { source: "workspace-template", file: path.join(cwd, ".openclaw", "openclaw.template.json") },
    { source: "workspace-config", file: path.join(cwd, ".openclaw", "openclaw.json") },
    { source: "home-config", file: path.join(home, ".openclaw", "openclaw.json") }
  ];

  for (const candidate of candidates) {
    try {
      const raw = await fs.readFile(candidate.file, "utf8");
      return {
        ok: true,
        value: JSON.parse(raw),
        file: redactText(candidate.file, home),
        source: candidate.source
      };
    } catch {
      // Try the next config source.
    }
  }

  return { ok: false, message: "No workspace or home OpenClaw config/template found" };
}

function summarizeConfig(config, home) {
  const defaults = config.value?.agents?.defaults ?? {};
  const configuredModels = Object.keys(defaults?.models ?? {});
  return {
    ok: true,
    source: config.source,
    workspace: redactText(defaults?.workspace ?? "unset", home),
    primaryModel: defaults?.model?.primary ?? defaults?.model ?? "unset",
    thinkingDefault: defaults?.thinkingDefault ?? "unset",
    configuredModels,
    providers: Object.keys(config.value?.models?.providers ?? {})
  };
}

function readOllamaModels(configured = []) {
  const result = spawnSync("ollama", ["list"], {
    encoding: "utf8",
    timeout: 5000,
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status !== 0) {
    return {
      ok: false,
      models: [],
      configured,
      localConfiguredInstalled: 0,
      localConfiguredMissing: configured,
      message: "Ollama is not reachable"
    };
  }

  const models = result.stdout
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);

  const installed = configured.filter((model) => models.includes(model));

  return {
    ok: true,
    models,
    configured,
    localConfiguredInstalled: installed.length,
    localConfiguredMissing: configured.filter((model) => !models.includes(model)),
    message: `${models.length} Ollama models detected`
  };
}

async function inspectWorkspace(cwd) {
  const expected = ["AGENTS.md", "CLAWDECK.md", "SOUL.md", "USER.md", "TOOLS.md", "HEARTBEAT.md", "OFFLINE.md"];
  const present = [];
  const missing = [];
  const sourceCheckout = await isSourceCheckout(cwd);

  for (const file of expected) {
    try {
      await fs.access(path.join(cwd, file));
      present.push(file);
    } catch {
      missing.push(file);
    }
  }

  return {
    cwd: redactText(cwd, os.homedir()),
    present,
    missing,
    score: present.length,
    max: expected.length,
    sourceCheckout
  };
}

async function isSourceCheckout(cwd) {
  const resolved = path.resolve(cwd);
  if (resolved === SOURCE_ROOT) return true;

  try {
    const pkg = JSON.parse(await fs.readFile(path.join(resolved, "package.json"), "utf8"));
    if (pkg?.name !== "clawdeck" && pkg?.name !== "@dicnunz/clawdeck") return false;
    await fs.access(path.join(resolved, "src", "cli.js"));
    await fs.access(path.join(resolved, "templates", "CLAWDECK.md"));
    return true;
  } catch {
    return false;
  }
}

function inspectLocalOnly(config) {
  if (!config.ok) {
    return { ok: false, cloudModels: [], message: "OpenClaw config unavailable" };
  }

  const aliases = Object.keys(config.value?.agents?.defaults?.models ?? {});
  const primary = config.value?.agents?.defaults?.model?.primary ?? "";
  const cloudModels = [...new Set([...aliases, primary]
    .filter(Boolean)
    .filter((model) => !model.startsWith("ollama/")))];

  return {
    ok: cloudModels.length === 0,
    cloudModels,
    message: cloudModels.length === 0 ? "No hosted model aliases in active defaults" : `Hosted aliases in active defaults: ${cloudModels.join(", ")}`
  };
}

function extractConfiguredLocalModels(config) {
  const aliases = Object.keys(config?.agents?.defaults?.models ?? {});
  const providerModels = config?.models?.providers?.ollama?.models?.map((model) => model.id) ?? [];
  return [...new Set([
    ...aliases
      .filter((model) => model.startsWith("ollama/"))
      .map((model) => model.slice("ollama/".length)),
    ...providerModels
  ])];
}

function redactDoctor(doctor, home) {
  return {
    ...doctor,
    checks: doctor.checks.map((check) => ({
      ...check,
      message: redactText(check.message, home)
    }))
  };
}

function statusOf(doctor, name) {
  return doctor.checks.find((check) => check.name === name)?.status ?? "missing";
}

function points(name, passed, max) {
  return { name, earned: passed ? max : 0, max };
}

function label(score) {
  if (score >= 90) return "showpiece";
  if (score >= 75) return "solid";
  if (score >= 55) return "promising";
  return "needs setup";
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value, max) {
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function displayPath(file) {
  const relative = path.relative(process.cwd(), file);
  if (relative && !relative.startsWith("..")) return relative;
  return redactText(file);
}
