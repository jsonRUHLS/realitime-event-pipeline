import type { Server } from "node:http";
import { app } from "./server.js";
import { config } from "./utils/config.js";
import { connectKafka, closeKafka } from "./utils/kafka.js";
import { connectMongo, closeMongo } from "./utils/mongodb.js";
import { startOutboxRelay, stopOutboxRelay } from "./utils/outbox.js";

export async function startRuntime(
  port = config.PORT,
): Promise<Server> {
  await connectMongo();
  await connectKafka();
  startOutboxRelay();

  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });

    server.once("error", reject);
  });
}

export async function stopRuntime(server?: Server): Promise<void> {
  await stopOutboxRelay();

  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await closeKafka();
  await closeMongo();
}