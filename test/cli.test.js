import test from "node:test";
import assert from "node:assert/strict";
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
  assert.match(output, /clawdeck drill/);
  assert.match(output, /clawdeck smoke/);
  assert.match(output, /clawdeck handoff/);
  assert.match(output, /no-wifi readiness/);
});
