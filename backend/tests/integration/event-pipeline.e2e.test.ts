import { randomUUID } from "node:crypto";
import { createClient } from "@clickhouse/client";
import { Collection, Document, MongoClient, WithId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { waitFor } from "../helpers/wait-for.js";

type AcceptedEvent = {
  status: "accepted";
  eventId: string;
  outboxId: string;
};

type RawEvent = {
  _id?: any;
  eventId: string;
  eventType: string;
  userId: string;
  sessionId: string;
  eventTimestamp: Date;
  receivedAt: Date;
  properties: Record<string, unknown>;
};

type OutboxEvent = {
  eventId: string;
  status: "pending" | "processing" | "published";
  attempts: number;
  payload: {
    eventId: string;
    eventType: string;
    userId: string;
    sessionId: string;
    eventTimestamp: string;
    receivedAt: string;
    properties: string;
  };
  publishedAt?: Date;
};

type AnalyticsEvent = {
  eventId: string;
  eventType: string;
  userId: string;
  sessionId: string;
  properties: string;
};

const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3001";

const mongoUri =
  process.env.MONGODB_URI ??
  "mongodb://admin:password@localhost:27017/events?authSource=admin&replicaSet=rs0";

const mongoDatabase = process.env.MONGODB_DATABASE ?? "events";
const mongoCollection = process.env.MONGODB_COLLECTION ?? "raw_events";

const clickhouseUrl = process.env.CLICKHOUSE_URL ?? "http://localhost:8123";

const clickhouseUser = process.env.CLICKHOUSE_USER ?? "default";
const clickhousePassword = process.env.CLICKHOUSE_PASSWORD ?? "password";

const runId = randomUUID();
const payload = {
  eventType: "pipeline_test",
  userId: `test-user-${runId}`,
  sessionId: `test-session-${runId}`,
  timestamp: new Date().toISOString(),
  properties: {
    source: "vitest",
    runId,
    feature: "event-pipeline-e2e",
  },
};

let mongoClient: MongoClient;
let eventsCollection: Collection<RawEvent>;
let outboxCollection: Collection<OutboxEvent>;
let clickhouse: ReturnType<typeof createClient>;
let acceptedEvent: AcceptedEvent;

beforeAll(async () => {
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  const database = mongoClient.db(mongoDatabase);

  eventsCollection = database.collection<RawEvent>(mongoCollection);
  outboxCollection = database.collection<OutboxEvent>("event_outbox");

  clickhouse = createClient({
    url: clickhouseUrl,
    username: clickhouseUser,
    password: clickhousePassword,
  });

  await waitFor(
    async () => {
      const response = await fetch(`${apiBaseUrl}/api/health`);

      return response.ok;
    },
    Boolean,
    {
      description: "the backend health endpoint",
    },
  );
});

afterAll(async () => {
  await mongoClient.close();
  await clickhouse.close();
});

describe.sequential("event pipeline", () => {
  it("2. accepts a valid tracking event", async () => {
    const response = await fetch(`${apiBaseUrl}/api/track`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    acceptedEvent = await response.json();

    expect(response.status).toBe(202);
    expect(acceptedEvent.status).toBe("accepted");
    expect(acceptedEvent.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(acceptedEvent.outboxId).toMatch(/^[0-9a-f]{24}$/i);
  });

  it("3. persists the source event in MongoDB", async () => {
    const event = await waitFor(
      async () =>
        eventsCollection.findOne({
          eventId: acceptedEvent.eventId,
        }),
      (value): value is RawEvent & { _id: unknown } =>
        value !== null && "_id" in value,
      {
        description: "the raw event in MongoDB",
      },
    );

    if (!event) {
      throw new Error("Expected raw event to exist");
    }

    expect(event).toMatchObject({
      eventId: acceptedEvent.eventId,
      eventType: payload.eventType,
      userId: payload.userId,
      sessionId: payload.sessionId,
      properties: payload.properties,
    });

    expect(event.eventTimestamp).toBeInstanceOf(Date);
    expect(event.receivedAt).toBeInstanceOf(Date);
  });

  it("4. publishes the matching outbox record", async () => {
    const outboxEvent = await waitFor(
      async () =>
        outboxCollection.findOne({
          eventId: acceptedEvent.eventId,
        }),
      (value): value is WithId<OutboxEvent> =>
        value !== null && value.status === "published",
      {
        description: "the outbox event to be published to Kafka",
      },
    );

    if (!outboxEvent) {
      throw new Error("Expected published outbox event to exist");
    }

    expect(outboxEvent).toMatchObject({
      eventId: acceptedEvent.eventId,
      status: "published",
    });

    expect(outboxEvent.attempts).toBeGreaterThanOrEqual(1);
    expect(outboxEvent.publishedAt).toBeInstanceOf(Date);
    expect(JSON.parse(outboxEvent.payload.properties)).toEqual(
      payload.properties,
    );
  });

  it("5. persists the matching event in ClickHouse", async () => {
    const analyticsEvent = await waitFor(
      async () => {
        const result = await clickhouse.query({
          query: `
            SELECT
              eventId,
              eventType,
              userId,
              sessionId,
              properties
            FROM analytics.events_analytics
            WHERE eventId = {eventId:String}
            LIMIT 1
          `,
          query_params: {
            eventId: acceptedEvent.eventId,
          },
          format: "JSONEachRow",
        });

        const rows = await result.json<AnalyticsEvent>();

        return rows[0] ?? null;
      },
      (value): value is AnalyticsEvent => value !== null,
      {
        timeoutMs: 30_000,
        description: "the event in ClickHouse analytics.events_analytics",
      },
    );

    expect(analyticsEvent).toEqual({
      eventId: acceptedEvent.eventId,
      eventType: payload.eventType,
      userId: payload.userId,
      sessionId: payload.sessionId,
      properties: JSON.stringify(payload.properties),
    });
  });
});
