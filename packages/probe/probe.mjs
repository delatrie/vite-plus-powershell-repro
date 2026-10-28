import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageDir = dirname(fileURLToPath(import.meta.url));
const outputDir = join(packageDir, "out");
const log = (message) => console.error(`[${new Date().toISOString()}] ${message}`);

export async function runProbe() {
  if (process.platform !== "win32") {
    throw new Error("This reproduction must run on Windows.");
  }

  await mkdir(outputDir, { recursive: true });
  const tracePath = join(outputDir, `powershell-${Date.now()}-${process.pid}.trace.log`);
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy", "Bypass",
    "-File", join(packageDir, "probe.ps1"),
    tracePath,
  ];
  log(JSON.stringify({
    node: process.version,
    execPath: process.execPath,
    arch: process.arch,
    pid: process.pid,
    ppid: process.ppid,
    cwd: process.cwd(),
    command: "powershell.exe",
    args,
    environment: Object.fromEntries(
      ["SystemRoot", "WINDIR", "ComSpec", "PATH", "PSModulePath", "TEMP", "TMP"]
        .map((key) => [key, process.env[key] ?? null]),
    ),
  }, null, 2));

  const started = Date.now();
  // Match the failing test's execFile, piped stdio, and 40-second timeout.
  const operation = execFileAsync("powershell.exe", args, {
    cwd: packageDir,
    env: { ...process.env },
    windowsHide: true,
    timeout: 40_000,
    maxBuffer: 1024 * 1024,
  });
  log(`PowerShell spawned; pid=${operation.child.pid}`);
  const heartbeat = setInterval(() => {
    log(`Still waiting for PowerShell; pid=${operation.child.pid}; elapsed=${Date.now() - started}ms`);
  }, 5_000);

  let result;
  let failure;
  try {
    result = await operation;
  } catch (error) {
    failure = error;
    result = { stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  } finally {
    clearInterval(heartbeat);
  }

  let trace;
  try {
    trace = await readFile(tracePath, "utf8");
  } catch (error) {
    trace = `Trace read failed: ${error.code}: ${error.message}`;
  }
  const diagnostics = {
    elapsedMs: Date.now() - started,
    childPid: operation.child.pid,
    code: failure ? failure.code ?? null : 0,
    signal: failure?.signal ?? null,
    killed: failure?.killed ?? false,
    stdout: result.stdout,
    stderr: result.stderr,
    tracePath,
    trace,
  };
  const text = JSON.stringify(diagnostics, null, 2);
  log(text);
  await writeFile(join(outputDir, "result.json"), `${text}\n`);

  if (failure) throw failure;
  if (!trace.includes("script complete")) {
    throw new Error("PowerShell exited without writing its final trace marker.");
  }
  if (!result.stdout.includes("Add-Type result: 42")) {
    throw new Error("PowerShell did not print the expected Add-Type result.");
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runProbe().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
