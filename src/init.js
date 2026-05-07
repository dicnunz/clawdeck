import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE_ROOT = path.join(SOURCE_ROOT, "templates");

export async function initWorkspace({ targetDir = ".", name, force = false } = {}) {
  const target = path.resolve(targetDir);
  const workspaceName = name ?? path.basename(target);
  const files = await listTemplateFiles(TEMPLATE_ROOT);
  const conflicts = [];

  for (const file of files) {
    const relative = path.relative(TEMPLATE_ROOT, file);
    const destination = path.join(target, relative);
    if (!force && await exists(destination)) {
      conflicts.push(relative);
    }
  }

  if (conflicts.length > 0) {
    throw new Error(`refusing to overwrite existing files: ${conflicts.join(", ")}. Re-run with --force if intended.`);
  }

  const created = [];
  for (const file of files) {
    const relative = path.relative(TEMPLATE_ROOT, file);
    const destination = path.join(target, relative);
    const body = await fs.readFile(file, "utf8");
    const rendered = body.replaceAll("{{PROJECT_NAME}}", workspaceName);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, rendered);
    created.push(relative);
  }

  return { targetDir: target, created };
}

async function listTemplateFiles(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listTemplateFiles(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }

  return files.sort();
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
