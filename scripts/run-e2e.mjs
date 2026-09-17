import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = process.env.E2E_PORT ?? "3211";
const BASE_URL = `http://127.0.0.1:${PORT}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function waitForServer(url, timeoutMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server not up yet
    }
    await delay(300);
  }
  throw new Error(`서버가 준비되지 않았습니다: ${url}`);
}

const buildCode = await run("node_modules/.bin/next", ["build"]);
if (buildCode !== 0) process.exit(buildCode);

const server = spawn("node_modules/.bin/next", ["start", "-p", PORT], {
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  await waitForServer(BASE_URL);
  const testCode = await run(process.execPath, ["--test", "tests/e2e.test.mjs"], {
    env: {
      ...process.env,
      BASE_URL,
      CHROME_PATH: process.env.CHROME_PATH ?? "/usr/bin/chromium",
    },
  });
  process.exitCode = testCode;
} finally {
  server.kill("SIGTERM");
}
