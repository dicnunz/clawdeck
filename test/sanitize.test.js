import test from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot, sanitize } from "../src/sanitize.js";

test("sanitize redacts secret-shaped keys and personal strings", () => {
  const result = sanitize({
    auth: { token: "abc" },
    nested: {
      apiKey: "sk-test",
      maxTokens: 2048,
      workspace: "/Users/example/.openclaw/workspace",
      owner: "person@example.com"
    },
    safe: "ollama/qwen2.5-coder:7b"
  }, { home: "/Users/example" });

  assert.equal(result.auth, "[redacted]");
  assert.equal(result.nested.apiKey, "[redacted]");
  assert.equal(result.nested.maxTokens, 2048);
  assert.equal(result.nested.workspace, "$HOME/.openclaw/workspace");
  assert.equal(result.nested.owner, "[email-redacted]");
  assert.equal(result.safe, "ollama/qwen2.5-coder:7b");
});

test("sanitize redacts macOS private var home path aliases", () => {
  const result = sanitize({
    direct: "/var/folders/demo/home/.openclaw/workspace",
    privateAlias: "/private/var/folders/demo/home/.openclaw/workspace"
  }, { home: "/var/folders/demo/home" });

  assert.equal(result.direct, "$HOME/.openclaw/workspace");
  assert.equal(result.privateAlias, "$HOME/.openclaw/workspace");
});

test("buildSnapshot keeps public setup summary", () => {
  const snapshot = buildSnapshot({
    agents: {
      defaults: {
        workspace: "/Users/example/.openclaw/workspace",
        thinkingDefault: "low",
        model: { primary: "ollama/qwen3:4b-instruct" },
        models: {
          "ollama/qwen3:4b-instruct": {},
          "openai-codex/gpt-5.5": {}
        }
      }
    },
    models: {
      providers: {
        ollama: {}
      }
    },
    plugins: {
      entries: {
        codex: { enabled: true },
        voice: { enabled: false }
      }
    }
  }, { home: "/Users/example", generatedAt: "2026-05-07T00:00:00.000Z" });

  assert.equal(snapshot.summary.primaryModel, "ollama/qwen3:4b-instruct");
  assert.equal(snapshot.summary.thinkingDefault, "low");
  assert.deepEqual(snapshot.summary.providers, ["ollama"]);
  assert.deepEqual(snapshot.summary.plugins, ["codex"]);
});
