import type { Server } from "node:http";
import { config } from "./utils/config.js";
import { startRuntime, stopRuntime } from "./runtime.js";

let httpServer: Server | undefined;

async function start() {
  httpServer = await startRuntime(config.PORT);

  console.log(`Backend listening on http://localhost:${config.PORT}`);
  console.log(`Health check: http://localhost:${config.PORT}/api/health`);
  console.log(`Event endpoint: http://localhost:${config.PORT}/api/track`);
}

async function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  await stopRuntime(httpServer);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

start().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});