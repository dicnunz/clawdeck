import test from "node:test";
import assert from "node:assert/strict";
import { runCli } from "../src/cli.js";

test("help exposes the offline drill command", async () => {
  let output = "";
  await runCli(["help"], {
    stdout: {
      write(value) {
        output += value;
      }
    }
  });

  assert.match(output, /clawdeck drill/);
  assert.match(output, /no-wifi readiness/);
});
