import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    cache: { tasks: true, scripts: false },
  },
});
