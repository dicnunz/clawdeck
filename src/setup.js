import os from "node:os";
import { adoptWorkspace } from "./adopt.js";
import { applyLocalProfile } from "./apply.js";
import { runAudit } from "./audit.js";
import { runSmoke } from "./smoke.js";

export async function runSetup({
  workspace,
  home = os.homedir(),
  name,
  force = false,
  linkAgents = true,
  yes = false,
  smoke = false,
  timeout = 60000
} = {}) {
  const adopted = await adoptWorkspace({
    workspace,
    home,
    name,
    force,
    linkAgents
  });
  const applied = await applyLocalProfile({
    home,
    workspace: adopted.workspace,
    yes
  });
  const drill = await runAudit({
    home,
    cwd: adopted.workspace,
    write: false
  });
  const smokeResult = smoke
    ? await runSmoke({
      home,
      cwd: adopted.workspace,
      timeout
    })
    : null;

  return {
    status: overallStatus({ applied, drill: drill.audit, smoke: smokeResult }),
    adopted,
    applied,
    drill: drill.audit,
    smoke: smokeResult,
    nextAction: nextAction({ applied, drill: drill.audit, smoke, smokeResult })
  };
}

export function formatSetupCli(result) {
  const lines = [
    `Clawdeck setup: ${result.status}`,
    `Workspace: ${result.adopted.displayWorkspace ?? result.adopted.workspace}`,
    `Config: ${result.applied.applied ? "applied" : "dry-run"}`,
    `Drill: ${result.drill.readiness.status}`,
    ""
  ];

  lines.push("Done:");
  lines.push(`- Workspace adopted from ${result.adopted.source}`);
  lines.push(`- Created ${result.adopted.created.length} files; kept ${result.adopted.skipped.length} existing files`);
  if (result.adopted.agentLink) {
    lines.push(`- ${result.adopted.agentLink.action} AGENTS.md local-mode pointer`);
  }
  lines.push(`- OpenClaw config ${result.applied.applied ? "written with backup" : "reviewed without writing"}`);
  lines.push(`- Readiness gates checked: ${readyCount(result.drill)}/${result.drill.readiness.gates.length} ready`);

  if (result.smoke) {
    lines.push(`- Smoke test: ${result.smoke.status}`);
  }

  if (result.applied.plan.modelCommands.length > 0) {
    lines.push("", "Models:");
    for (const command of result.applied.plan.modelCommands) {
      lines.push(`- ${command}`);
    }
  }

  lines.push("", "Next:");
  lines.push(`- ${result.nextAction}`);

  return `${lines.join("\n")}\n`;
}

function overallStatus({ applied, drill, smoke }) {
  if (!applied.applied) return "dry-run";
  if (smoke?.status === "fail") return "blocked";
  if (drill.readiness.status === "ready") return "ready";
  return "blocked";
}

function nextAction({ applied, drill, smoke, smokeResult }) {
  if (!applied.applied) {
    return "clawdeck setup --yes";
  }
  if (drill.readiness.status !== "ready") {
    return drill.readiness.nextAction;
  }
  if (smokeResult?.status === "fail") {
    return "clawdeck smoke";
  }
  if (!smoke) {
    return "clawdeck smoke";
  }
  return "Open the workspace in Codex/OpenClaw and keep CLAWDECK.md as the local-mode contract.";
}

function readyCount(audit) {
  return audit.readiness.gates.filter((gate) => gate.ok).length;
}
