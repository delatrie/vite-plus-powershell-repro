import { test } from "vite-plus/test";
import { runProbe } from "./probe.mjs";

test("powershell.exe starts, runs Add-Type, and exits", async () => {
  await runProbe();
});
