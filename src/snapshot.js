import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildSnapshot } from "./sanitize.js";

export async function writeSnapshot({ out = "clawdeck.snapshot.json", home = os.homedir() } = {}) {
  const configPath = path.join(home, ".openclaw", "openclaw.json");
  let raw;
  try {
    raw = await fs.readFile(configPath, "utf8");
  } catch {
    throw new Error(`cannot read ${configPath}; run OpenClaw onboarding first or pass a real home directory`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(`${configPath} is not valid JSON`);
  }

  const snapshot = buildSnapshot(config, { home });
  const absoluteOut = path.resolve(out);

  await fs.mkdir(path.dirname(absoluteOut), { recursive: true });
  await fs.writeFile(absoluteOut, `${JSON.stringify(snapshot, null, 2)}\n`);

  return { out: absoluteOut, snapshot };
}
