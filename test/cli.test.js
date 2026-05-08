import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runCli } from "../src/cli.js";

test("help exposes adopt, drill, smoke, and handoff commands", async () => {
  let output = "";
  await runCli(["help"], {
    stdout: {
      write(value) {
        output += value;
      }
    }
  });

  assert.match(output, /clawdeck adopt/);
  assert.match(output, /clawdeck setup/);
  assert.match(output, /clawdeck drill/);
  assert.match(output, /clawdeck smoke/);
  assert.match(output, /clawdeck handoff/);
  assert.match(output, /no-wifi readiness/);
});

test("boolean flags do not consume following positional arguments", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-cli-flags-"));
  const target = path.join(root, "workspace target");
  let output = "";

  await runCli(["local", "--force", target], {
    stdout: {
      write(value) {
        output += value;
      }
    }
  });

  assert.match(output, /workspace target/);
  await fs.access(path.join(target, "CLAWDECK.md"));
  await assert.rejects(fs.access(path.join(root, "CLAWDECK.md")));
});

test("value flags fail clearly when the value is missing", async () => {
  await assert.rejects(
    runCli(["apply", "--home"], {
      stdout: {
        write() {}
      }
    }),
    /option "--home" needs a value/
  );
});

test("unknown commands are reported before option parsing", async () => {
  await assert.rejects(
    runCli(["wat", "--home"], {
      stdout: {
        write() {}
      }
    }),
    /unknown command "wat"/
  );
});

test("subcommand help prints the command list instead of failing option parsing", async () => {
  let output = "";
  await runCli(["setup", "--help"], {
    stdout: {
      write(value) {
        output += value;
      }
    }
  });

  assert.match(output, /clawdeck setup/);
  assert.match(output, /clawdeck smoke/);
});

test("snapshot accepts an explicit home directory", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "clawdeck-cli-snapshot-"));
  const home = path.join(root, "home");
  const out = path.join(root, "snapshot.json");
  await fs.mkdir(path.join(home, ".openclaw"), { recursive: true });
  await fs.writeFile(path.join(home, ".openclaw", "openclaw.json"), JSON.stringify({
    auth: {
      token: "secret-token"
    },
    agents: {
      defaults: {
        workspace: path.join(home, ".openclaw", "workspace"),
        model: {
          primary: "ollama/qwen3:4b-instruct"
        },
        models: {
          "ollama/qwen3:4b-instruct": {}
        }
      }
    }
  }));

  await runCli(["snapshot", "--home", home, "--out", out], {
    stdout: {
      write() {}
    }
  });

  const snapshot = JSON.parse(await fs.readFile(out, "utf8"));
  assert.equal(snapshot.summary.workspace, "$HOME/.openclaw/workspace");
  assert.equal(snapshot.openclaw.auth, "[redacted]");
});
