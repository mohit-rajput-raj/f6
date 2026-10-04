/**
 * Dev startup script for Windows
 * 
 * Starts all dev servers with a staggered delay to prevent
 * Windows `spawn UNKNOWN` errors (errno -4094) that occur when
 * multiple Next.js Turbopack processes start simultaneously.
 * 
 * Uses npx to invoke tools directly instead of pnpm run dev,
 * avoiding extra process spawning layers on Windows.
 */
import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === "win32";

const apps = [
  {
    name: "server",
    cwd: resolve(__dirname, "apps/server"),
    cmd: isWindows ? "npx.cmd" : "npx",
    args: ["tsx", "watch", "src/index.ts"],
  },
  {
    name: "dashboard",
    cwd: resolve(__dirname, "apps/dashboard"),
    cmd: isWindows ? "npx.cmd" : "npx",
    args: ["next", "dev", "--port", "3002"],
    delay: 3000,
  },
  {
    name: "admin",
    cwd: resolve(__dirname, "apps/admin"),
    cmd: isWindows ? "npx.cmd" : "npx",
    args: ["next", "dev", "--port", "3003"],
    delay: 5000,
  },
];

const colors = {
  server:    "\x1b[36m",    // cyan
  dashboard: "\x1b[35m",    // magenta
  admin:     "\x1b[33m",    // yellow
  reset:     "\x1b[0m",
};

const processes = [];

function startApp(app) {
  return new Promise((resolvePromise) => {
    const color = colors[app.name] || colors.reset;
    console.log(`${color}[${app.name}]\x1b[0m Starting...`);

    const proc = spawn(app.cmd, app.args, {
      cwd: app.cwd,
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env },
    });

    proc.stdout?.on("data", (data) => {
      const lines = data.toString().split("\n").filter(Boolean);
      lines.forEach((line) => console.log(`${color}[${app.name}]\x1b[0m ${line}`));
    });

    proc.stderr?.on("data", (data) => {
      const lines = data.toString().split("\n").filter(Boolean);
      lines.forEach((line) => console.log(`${color}[${app.name}]\x1b[0m ${line}`));
    });

    proc.on("error", (err) => {
      console.error(`${color}[${app.name}]\x1b[0m Error: ${err.message}`);
    });

    proc.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`${color}[${app.name}]\x1b[0m ❌ Exited with code ${code}`);
      }
    });

    processes.push(proc);
    resolvePromise();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("\x1b[32m🚀 Starting dev servers (staggered for Windows compatibility)...\x1b[0m\n");

  for (const app of apps) {
    if (app.delay) {
      console.log(`\x1b[90m   Waiting ${app.delay / 1000}s before starting ${app.name}...\x1b[0m`);
      await sleep(app.delay);
    }
    await startApp(app);
  }

  console.log("\n\x1b[32m✓ All dev servers started!\x1b[0m");
  console.log("\x1b[90m   server:    http://localhost:3000\x1b[0m");
  console.log("\x1b[90m   dashboard: http://localhost:3002\x1b[0m");
  console.log("\x1b[90m   admin:     http://localhost:3003\x1b[0m\n");
}

// Graceful shutdown — kill entire process trees on Windows
function cleanup() {
  console.log("\n\x1b[31m🛑 Shutting down all dev servers...\x1b[0m");
  for (const proc of processes) {
    try {
      if (isWindows && proc.pid) {
        // On Windows, use taskkill to kill the entire process tree
        spawn("taskkill", ["/pid", proc.pid.toString(), "/T", "/F"], { stdio: "ignore" });
      } else {
        proc.kill("SIGTERM");
      }
    } catch {
      // ignore
    }
  }
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

main().catch(console.error);
