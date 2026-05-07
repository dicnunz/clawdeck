import os from "node:os";

const SECRET_WORDS = new Set([
  "auth",
  "token",
  "secret",
  "password",
  "credential",
  "credentials",
  "cookie",
  "session",
  "oauth"
]);
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function buildSnapshot(config, { home = os.homedir(), generatedAt = new Date().toISOString() } = {}) {
  const defaults = config?.agents?.defaults ?? {};

  return {
    schemaVersion: "clawdeck.snapshot.v1",
    generatedAt,
    summary: {
      primaryModel: defaults?.model?.primary ?? defaults?.model ?? null,
      thinkingDefault: defaults?.thinkingDefault ?? null,
      workspace: redactString(defaults?.workspace ?? null, home),
      modelAliases: Object.keys(defaults?.models ?? {}),
      providers: Object.keys(config?.models?.providers ?? {}),
      plugins: Object.entries(config?.plugins?.entries ?? {})
        .filter(([, value]) => value?.enabled === true)
        .map(([name]) => name)
    },
    openclaw: sanitize(config, { home })
  };
}

export function sanitize(value, { home = os.homedir() } = {}, trail = []) {
  if (Array.isArray(value)) {
    return value.map((item, index) => sanitize(item, { home }, [...trail, String(index)]));
  }

  if (value && typeof value === "object") {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (isSecretKey(key)) {
        output[key] = "[redacted]";
      } else {
        output[key] = sanitize(child, { home }, [...trail, key]);
      }
    }
    return output;
  }

  if (typeof value === "string") {
    return redactString(value, home);
  }

  return value;
}

function isSecretKey(key) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (words.some((word) => SECRET_WORDS.has(word))) {
    return true;
  }

  return (words.includes("api") && words.includes("key"))
    || (words.includes("private") && words.includes("key"));
}

function redactString(value, home) {
  if (value === null || value === undefined) return value;
  let redacted = String(value);
  for (const candidate of homePathVariants(home)) {
    redacted = redacted.replaceAll(candidate, "$HOME");
  }
  return redacted.replace(EMAIL, "[email-redacted]");
}

export function redactText(value, home = os.homedir()) {
  return redactString(String(value), home);
}

function homePathVariants(home) {
  const variants = new Set([home]);
  if (home.startsWith("/var/")) {
    variants.add(`/private${home}`);
  }
  if (home.startsWith("/private/var/")) {
    variants.add(home.slice("/private".length));
  }
  return [...variants].filter(Boolean).sort((left, right) => right.length - left.length);
}
