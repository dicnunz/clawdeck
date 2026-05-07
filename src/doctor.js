import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export async function runDoctor({ home = os.homedir() } = {}) {
  const checks = [];

  checks.push({
    name: "Node",
    status: major(process.versions.node) >= 20 ? "pass" : "fail",
    message: `v${process.versions.node}`
  });

  const openclawVersion = run("openclaw", ["--version"]);
  const hasOpenClaw = openclawVersion.ok;
  checks.push({
    name: "OpenClaw CLI",
    status: hasOpenClaw ? "pass" : "warn",
    message: hasOpenClaw ? clean(openclawVersion.stdout) : "not on PATH; install with `npm install -g openclaw@latest`"
  });

  const configPath = path.join(home, ".openclaw", "openclaw.json");
  const configResult = await readJson(configPath);
  checks.push({
    name: "OpenClaw config",
    status: configResult.ok ? "pass" : "warn",
    message: configResult.ok ? summarizeConfig(configResult.value) : `${configPath} not found or not valid JSON`
  });

  if (hasOpenClaw) {
    const gateway = run("openclaw", ["gateway", "status", "--json"], { timeout: 8000 });
    checks.push(formatGatewayCheck(gateway));
  } else {
    checks.push({
      name: "Gateway",
      status: "skip",
      message: "skipped because OpenClaw CLI is unavailable"
    });
  }

  const ollama = run("ollama", ["list"], { timeout: 5000 });
  checks.push({
    name: "Ollama",
    status: ollama.ok ? "pass" : "warn",
    message: ollama.ok ? "reachable" : "not detected; local models will be unavailable until Ollama is installed and running"
  });

  return {
    status: overall(checks),
    checks
  };
}

function formatGatewayCheck(result) {
  if (!result.ok) {
    return {
      name: "Gateway",
      status: "warn",
      message: "OpenClaw CLI is present, but gateway status did not return cleanly"
    };
  }

  try {
    const json = JSON.parse(result.stdout);
    const rpcOk = json?.rpc?.ok === true || json?.ok === true || json?.status === "ok";
    return {
      name: "Gateway",
      status: rpcOk ? "pass" : "warn",
      message: rpcOk ? "reachable" : "status returned, but RPC health was not clearly ok"
    };
  } catch {
    return {
      name: "Gateway",
      status: "warn",
      message: "status returned non-JSON output"
    };
  }
}

function summarizeConfig(config) {
  const defaults = config?.agents?.defaults ?? {};
  const primary = defaults?.model?.primary ?? defaults?.model ?? "unset";
  const thinking = defaults?.thinkingDefault ?? "unset";
  const modelCount = Object.keys(defaults?.models ?? {}).length;
  const ollamaModels = config?.models?.providers?.ollama?.models?.length ?? 0;
  return `primary=${primary}, thinking=${thinking}, aliases=${modelCount}, ollamaModels=${ollamaModels}`;
}

async function readJson(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function run(command, args, { timeout = 10000 } = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"]
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error
  };
}

function overall(checks) {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

function major(version) {
  return Number(version.split(".")[0]);
}

function clean(text) {
  return text.trim().split("\n")[0] || "installed";
}
