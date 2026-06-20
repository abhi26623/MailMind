import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ensureProductionSchema } from "./ensure-production-schema.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(
  rootDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

try {
  await ensureProductionSchema();
} catch (error) {
  console.error("Production schema bootstrap failed. Starting web server anyway.");
  console.error(error);
}

const port = process.env.PORT ?? "3000";
const command = existsSync(nextBin) ? nextBin : "next";
const child = spawn(command, ["start", "-H", "0.0.0.0", "-p", port], {
  cwd: rootDir,
  env: process.env,
  stdio: "inherit",
  shell: !existsSync(nextBin),
});

function forwardSignal(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("error", (error) => {
  console.error("Failed to start Next.js:", error);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
