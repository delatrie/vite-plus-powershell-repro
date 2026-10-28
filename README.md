# PowerShell startup under Vite Plus task caching

Standalone Yarn workspace reproduction. Versions match the failing project:
Node.js 24.14.1 (x64 on CI), Yarn 4.18.1, Vite Plus 1.2.0, Vitest 5.0.4.
The lockfile and relevant transitive dependency overrides come from that project
to keep the dependency versions comparable. There is no Allure dependency.

Push this directory as the root of a GitHub repository. The workflow runs on
push, pull requests, and manual dispatch. No secrets or remote task cache are needed.

## Run locally on Windows

```text
corepack enable
corepack prepare yarn@4.18.1 --activate
yarn install --immutable
yarn repro
```

The four independent CI jobs compare:

| Command | Execution chain |
| --- | --- |
| `yarn repro:direct` | Yarn workspace -> Node -> powershell.exe |
| `yarn repro:node` | Yarn workspace -> cached Vite task -> Node -> powershell.exe |
| `yarn repro` | Yarn workspace -> cached Vite task -> Vitest worker -> powershell.exe |
| `yarn repro:no-cache` | Yarn workspace -> uncached Vite task -> Vitest worker -> powershell.exe |

Each job gets a fresh checkout with an empty task cache. Cached jobs exercise
cache-miss execution and automatic dependency tracking; they do not replay results.
For local reruns, `yarn exec vp cache clean` clears the task cache so PowerShell
really executes again. Do this before each cached rerun.

The same Node function launches Windows PowerShell (`powershell.exe`, not `pwsh`)
with piped stdio, `windowsHide: true`, and a 40-second child timeout. The Vitest
timeout is 55 seconds, leaving time to capture the child timeout diagnostics.
Node prints a heartbeat every five seconds. PowerShell writes its first marker
using .NET file I/O and stderr before compiling a trivial type with `Add-Type`.

Console output and the uploaded `diagnostics-*` artifacts include process IDs,
elapsed time, selected environment variables, captured stdout/stderr, the exact
trace-read error if any, PowerShell architecture/runtime, and compilation markers.

## Interpret the comparison

- Only cached jobs hang: investigate Vite task caching/dependency tracking.
- Only cached Vitest hangs: investigate the interaction with the Vitest worker.
- All jobs hang: the task-cache hypothesis alone does not explain this case.
- No PowerShell marker: startup, argument handling, or the first trace operation.
- Last marker is `Add-Type starting`: compilation/loading is the next boundary.
- All pass: this smaller case does not reproduce the original failure yet.

Vite task caching documentation: https://viteplus.dev/guide/cache
