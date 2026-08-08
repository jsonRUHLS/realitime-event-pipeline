import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: Server;
let apiBaseUrl: string;

beforeAll(async () => {
  process.env.MONGODB_URI ??=
    "mongodb://admin:password@localhost:27017/events?authSource=admin&replicaSet=rs0";

  const { app } = await import("../../src/server.js");

  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Unable to determine test server address");
  }

  apiBaseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("POST /api/track validation", () => {
  it("returns 400 when required event fields are absent", async () => {
    const response = await fetch(`${apiBaseUrl}/api/track`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        eventType: "page_view"
      })
    });

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      status: "error",
      message: "Invalid event payload"
    });

    expect(body.errors.fieldErrors).toMatchObject({
      userId: expect.any(Array),
      sessionId: expect.any(Array)
    });
  });
});