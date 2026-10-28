import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      probe: {
        command: "node probe.mjs",
        cache: true,
      },
      "vp:test": {
        command: "vp test run",
        cache: true,
      },
    },
  },
  test: {
    include: ["probe.test.mjs"],
    testTimeout: 55_000,
    reporters: ["verbose"],
    disableConsoleIntercept: true,
  },
});
