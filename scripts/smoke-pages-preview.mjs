import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 4187;
const basePath = "/Earth-Online-Journal/";
const previewUrl = `http://${host}:${port}${basePath}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    host,
    "--base",
    basePath,
    "--port",
    String(port),
    "--strictPort",
  ],
  {
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverOutput = "";
let serverExited = false;

server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

server.on("exit", () => {
  serverExited = true;
});

try {
  await waitForPreview();
  console.log(`Pages preview smoke test passed: ${previewUrl}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));

  if (serverOutput.trim()) {
    console.error(serverOutput.trim());
  }

  process.exitCode = 1;
} finally {
  server.kill();
}

async function waitForPreview() {
  const startedAt = Date.now();
  const timeoutMs = 30_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (serverExited) {
      throw new Error("Preview server exited before the Pages app responded.");
    }

    try {
      const response = await fetchWithTimeout(previewUrl, 2_000);
      const html = await response.text();

      if (response.ok && html.includes("Earth Online Journal")) {
        return;
      }
    } catch {
      // The preview server can take a moment to bind the port.
    }

    await delay(500);
  }

  throw new Error(`Preview server did not respond at ${previewUrl}.`);
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
