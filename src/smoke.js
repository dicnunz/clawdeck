import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PROMPT = "Reply with exactly: ok";

export async function runSmoke({
  home = os.homedir(),
  cwd = process.cwd(),
  model,
  timeout = 60000,
  openclaw = true,
  runner = defaultRunner
} = {}) {
  const resolved = model ?? await readPrimaryModel({ home, cwd }) ?? "ollama/qwen3:4b-instruct";
  const modelRef = resolved.startsWith("ollama/") ? resolved : `ollama/${resolved}`;
  const ollamaModel = modelRef.slice("ollama/".length);
  const checks = [];

  checks.push(runCheck({
    name: "Ollama model reply",
    command: "ollama",
    args: ["run", ollamaModel, PROMPT],
    timeout,
    runner,
    okPattern: /^ok\b/i
  }));

  if (openclaw) {
    checks.push(runCheck({
      name: "OpenClaw local inference",
      command: "openclaw",
      args: ["infer", "model", "run", "--model", modelRef, "--prompt", PROMPT],
      timeout,
      runner,
      env: { ...process.env, HOME: home },
      okPattern: /\bok\b/i
    }));
  }

  return {
    status: checks.every((check) => check.ok) ? "pass" : "fail",
    model: modelRef,
    checks
  };
}

export function formatSmokeCli(result) {
  const lines = [
    `Clawdeck smoke: ${result.status}`,
    `Model: ${result.model}`,
    ""
  ];

  for (const check of result.checks) {
    lines.push(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
  }

  return `${lines.join("\n")}\n`;
}

async function readPrimaryModel({ home, cwd }) {
  const candidates = [
    path.join(cwd, ".openclaw", "openclaw.template.json"),
    path.join(cwd, ".openclaw", "openclaw.json"),
    path.join(home, ".openclaw", "openclaw.json")
  ];

  for (const file of candidates) {
    try {
      const config = JSON.parse(await fs.readFile(file, "utf8"));
      const primary = config?.agents?.defaults?.model?.primary;
      if (typeof primary === "string" && primary) return primary;
    } catch {
      // Try the next config source.
    }
  }

  return null;
}

function runCheck({ name, command, args, timeout, runner, env = process.env, okPattern }) {
  const result = runner(command, args, { timeout, env });
  const stdout = stripAnsi(result.stdout ?? "").trim();
  const stderr = stripAnsi(result.stderr ?? "").trim();
  const ok = result.status === 0 && okPattern.test(stdout);

  return {
    name,
    ok,
    command: [command, ...args].join(" "),
    message: ok ? summarize(stdout) : summarize(stderr || stdout || result.error?.message || "no output")
  };
}

function defaultRunner(command, args, { timeout, env }) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function summarize(value) {
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return "ok";
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}
