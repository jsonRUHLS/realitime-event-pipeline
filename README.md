# Real-Time Event Pipeline

[![CI](https://github.com/jsonRUHLS/realitime-event-pipeline/actions/workflows/ci.yaml/badge.svg?branch=main&event=push)](https://github.com/jsonRUHLS/realitime-event-pipeline/actions/workflows/ci.yaml)
[![Coverage](https://raw.githubusercontent.com/jsonRUHLS/realitime-event-pipeline/badges/badges/coverage.svg)](https://github.com/jsonRUHLS/realitime-event-pipeline/actions/workflows/ci.yaml)
[![Docker Compose Build](https://github.com/jsonRUHLS/realitime-event-pipeline/actions/workflows/docker-build.yaml/badge.svg?branch=main&event=push)](https://github.com/jsonRUHLS/realitime-event-pipeline/actions/workflows/docker-build.yaml)

Real-time event pipeline using React, Node.js, Kafka, ClickHouse, MongoDB, and Grafana.

A production-style, self-hosted event pipeline demonstrating reliable event delivery, real-time analytics, and operational recovery patterns.

```text
React frontend
    ↓
Node.js / Express API
    ↓
MongoDB transaction
    ├── raw_events
    └── event_outbox
    ↓
Outbox relay with retry + exponential backoff
    ↓
Kafka: user-events
    ↓
ClickHouse Kafka engine
    ↓
Materialized view
    ↓
ClickHouse MergeTree analytics table
    ↓
Grafana analytics dashboard
```

## What It Demonstrates

- React event tracking with typed event payloads
- Node.js and Express API development with TypeScript
- Zod validation at the API boundary
- MongoDB transactional outbox pattern
- Kafka production with a stable message key (`userId`)
- Outbox retry behavior with exponential backoff and lock recovery
- ClickHouse Kafka-engine ingestion and materialized-view transforms
- Grafana event-volume and event-type analytics
- Protected manual outbox requeue endpoint for reliability testing
- Docker Compose-based local infrastructure
- At-least-once delivery and downstream idempotency using `eventId`
- Local operational troubleshooting with Compose, container logs, and pipeline reconciliation

## Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, TypeScript, Vite | Emits product and user-behavior events |
| API | Node.js, Express, TypeScript | Validates, persists, and queues events |
| Operational database | MongoDB replica set | Stores raw events and outbox records transactionally |
| Event streaming | Apache Kafka | Durable event transport through `user-events` |
| Broker coordination | ZooKeeper | Kafka broker coordination |
| Analytics database | ClickHouse | Fast event storage and time-series aggregation |
| Dashboard | Grafana | Real-time analytics and pipeline visibility |
| Local infrastructure | Docker Compose | Runs Kafka, MongoDB, ClickHouse, and Grafana |
| Package manager | pnpm workspace | Manages frontend and backend packages |
| Runtime manager | nvm | Manages Node.js versions per development machine |

## Repository Layout

```text
realitime-event-pipeline/
├── backend/                    # Express API, outbox relay, MongoDB/Kafka clients
│   ├── .env.example
│   ├── src/
│   │   ├── routes/             # Event, outbox-status, and admin routes
│   │   └── utils/              # Config, schema, MongoDB, Kafka, outbox modules
│   └── package.json
├── frontend/                   # React + Vite event-tracking client
├── clickhouse-init/            # ClickHouse schema and Kafka-engine definitions
├── docker/
│   └── mongodb/                # Local MongoDB replica-set image and keyfile location
├── screenshots/                # Project screenshots and dashboard images
├── docker-compose.yml          # Local services and initialization jobs
├── package.json                # pnpm workspace scripts
└── pnpm-workspace.yaml
```

## Prerequisites

Install and verify:

- Node.js 24.x, managed through `nvm`
- pnpm 11
- Docker Desktop with Docker Compose V2
- Git

```bash
node --version
pnpm --version
docker --version
docker compose version
git --version
```

### Node.js Setup

Use `nvm` so the project does not depend on a globally installed system or Homebrew Node version.

```bash
nvm install 24
nvm use 24
nvm alias default 24
```

Verify the active runtime:

```bash
node --version
nvm current
which node
```

Expected:

```text
v24.x.x
v24.x.x
/Users/YOUR_USERNAME/.nvm/versions/node/v24.x.x/bin/node
```

If `nvm current` says `system`, or `node --version` shows an older version such as Node 16, activate Node 24 explicitly:

```bash
nvm use 24
```

For new terminal sessions, ensure the following block appears near the bottom of `~/.zshrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use default >/dev/null
```

Reload the shell:

```bash
source ~/.zshrc
```

## Local Setup

### 1. Clone and install dependencies

SSH clone:

```bash
git clone git@github.com:jsonRUHLS/realitime-event-pipeline.git
cd realitime-event-pipeline
pnpm install
```

Or use HTTPS if GitHub SSH has not been configured on this computer:

```bash
git clone https://github.com/jsonRUHLS/realitime-event-pipeline.git
cd realitime-event-pipeline
pnpm install
```

If pnpm asks you to approve the `esbuild` install script:

```bash
pnpm approve-builds esbuild
pnpm install
```

### 2. Create local secrets

Create the MongoDB replica-set keyfile used by the local Docker image:

```bash
mkdir -p docker/mongodb
openssl rand -base64 756 > docker/mongodb/mongo-keyfile
chmod 400 docker/mongodb/mongo-keyfile
```

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Generate an admin API key:

```bash
openssl rand -hex 32
```

Paste the value into `backend/.env`:

```env
ADMIN_API_KEY=replace-with-your-generated-value
```

> Never commit `backend/.env` or `docker/mongodb/mongo-keyfile`.

### 3. Start infrastructure

```bash
pnpm infra:up
```

Equivalent Compose command:

```bash
docker compose up -d
```

Check service status:

```bash
docker compose ps
```

Expected long-running services:

```text
pipeline-zookeeper
pipeline-kafka
pipeline-mongodb
pipeline-clickhouse
pipeline-grafana
```

The following initialization jobs may run and then exit successfully:

```text
realitime-event-pipeline-mongodb-init-1
realitime-event-pipeline-kafka-init-1
```

A completed initialization job is expected. It is not an infrastructure failure.

### 4. Verify MongoDB replica set

The Compose initialization workflow should configure the MongoDB replica set. Verify it is primary:

```bash
docker exec pipeline-mongodb mongosh \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --eval 'rs.status().members.map(m => ({name: m.name, stateStr: m.stateStr}))'
```

Expected result:

```text
[{ name: 'localhost:27017', stateStr: 'PRIMARY' }]
```

If the replica set has not been initialized, run:

```bash
docker exec pipeline-mongodb mongosh \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --eval 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}]})'
```

### 5. Verify the Kafka topic

The Compose initialization workflow should create `user-events`. Verify it:

```bash
docker exec pipeline-kafka kafka-topics \
  --bootstrap-server kafka:29092 \
  --describe \
  --topic user-events
```

If the topic does not exist, create it:

```bash
docker exec pipeline-kafka kafka-topics \
  --bootstrap-server kafka:29092 \
  --create \
  --if-not-exists \
  --topic user-events \
  --partitions 3 \
  --replication-factor 1
```

### 6. Start application services

In one terminal:

```bash
pnpm dev:backend
```

In another terminal:

```bash
pnpm dev:frontend
```

## Local URLs

| Service | URL |
|---|---|
| React frontend | http://localhost:5173 |
| Node.js API health check | http://localhost:3001/api/health |
| Outbox status | http://localhost:3001/api/outbox/status |
| Grafana | http://localhost:3000 |
| ClickHouse HTTP | http://localhost:8123 |
| MongoDB | mongodb://localhost:27017 |
| Kafka | localhost:9092 |

Default Grafana credentials:

```text
Username: admin
Password: admin
```

## API

### Health Check

```bash
curl http://localhost:3001/api/health
```

### Track an Event

```bash
curl -X POST http://localhost:3001/api/track \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "page_view",
    "userId": "user-001",
    "sessionId": "session-001",
    "properties": {
      "page": "/dashboard",
      "source": "curl"
    }
  }'
```

Successful requests return `202 Accepted` after the event and its outbox record commit in MongoDB.

### Outbox Status

```bash
curl http://localhost:3001/api/outbox/status
```

Example response:

```json
{
  "status": "ok",
  "counts": {
    "pending": 0,
    "processing": 0,
    "published": 23
  },
  "oldestPending": null,
  "recentFailures": []
}
```

### Manual Outbox Requeue

This endpoint is intended for local reliability and duplicate-delivery testing.

```bash
curl -X POST \
  http://localhost:3001/api/admin/outbox/EVENT_ID/requeue \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: YOUR_ADMIN_API_KEY" \
  -d '{
    "reason": "Manual duplicate-delivery test"
  }'
```

Requeueing an already-published record republishes the same `eventId`. This intentionally tests at-least-once delivery behavior.

## Outbox Design

The API does **not** write directly to MongoDB and Kafka in the request handler. Instead, it performs one MongoDB transaction:

```text
Transaction
    ├── Insert raw event into raw_events
    └── Insert pending Kafka payload into event_outbox
```

The background relay claims pending outbox records, publishes them to Kafka, and marks them `published`. If Kafka is unavailable, the relay stores the failure reason and retries with exponential backoff.

```text
pending → processing → published
            │
            └── failure → pending (retry later)
```

This gives the pipeline at-least-once publication to Kafka. Downstream consumers should use `eventId` as an idempotency key.

## ClickHouse Analytics

The Kafka table receives JSON timestamp values as strings. The materialized view converts them into `DateTime64(3, 'UTC')` values before inserting into the durable MergeTree analytics table.

Verify the analytics row count:

```bash
docker exec pipeline-clickhouse clickhouse-client \
  --user default \
  --password password \
  --query "SELECT count() FROM analytics.events_analytics"
```

Inspect recent events:

```bash
docker exec pipeline-clickhouse clickhouse-client \
  --user default \
  --password password \
  --query "
    SELECT
      eventId,
      eventType,
      userId,
      eventTimestamp,
      receivedAt
    FROM analytics.events_analytics
    ORDER BY receivedAt DESC
    LIMIT 20
  "
```

## Grafana Panels

Configure the ClickHouse data source with:

| Setting | Value |
|---|---|
| Server address | `clickhouse` |
| Port | `8123` |
| Protocol | `HTTP` |
| Database | `analytics` |
| Username | `default` |
| Password | `password` |

Recommended panels:

### Events Per Minute

```sql
SELECT
  toStartOfMinute(eventTimestamp) AS time,
  count() AS events
FROM analytics.events_analytics
WHERE $__timeFilter(eventTimestamp)
GROUP BY time
ORDER BY time ASC
```

### Events by Type

```sql
SELECT
  toStartOfMinute(eventTimestamp) AS time,
  eventType AS metric,
  count() AS events
FROM analytics.events_analytics
WHERE $__timeFilter(eventTimestamp)
GROUP BY time, metric
ORDER BY time ASC, metric ASC
```

### Top Event Types

```sql
SELECT
  eventType,
  count() AS events
FROM analytics.events_analytics
WHERE $__timeFilter(eventTimestamp)
GROUP BY eventType
ORDER BY events DESC
LIMIT 10
```

## Analytics Dashboard

The Grafana dashboard visualizes real-time event throughput, event-type distribution, recent event activity, and ClickHouse-backed analytics.

![Grafana dashboard showing events per minute, event types, top event types, and recent pipeline events](screenshots/grafana-dashboard.png)

The dashboard reads from `analytics.events_analytics`, which is populated through the Kafka → ClickHouse materialized-view ingestion path.

### Pipeline Reconciliation

The project includes separate operational and analytics checks:

```text
MongoDB outbox published count:  23
ClickHouse analytics row count: 23
```

This confirms published outbox events are reaching Kafka and persisting in ClickHouse.

```bash
curl http://localhost:3001/api/outbox/status

docker exec pipeline-clickhouse clickhouse-client \
  --user default \
  --password password \
  --query "SELECT count() FROM analytics.events_analytics"
```

## Testing Failure Recovery

Stop Kafka:

```bash
docker compose stop kafka
```

Send an event with `POST /api/track`. The API should still return `202 Accepted`, while `/api/outbox/status` shows a pending or processing record with retry details.

Restart Kafka:

```bash
docker compose start kafka
```

The relay should retry, publish the event, and eventually return the outbox record to `published`.

## Operations and Troubleshooting

### Inspect Compose services

```bash
docker compose ps
```

### Follow all infrastructure logs

```bash
pnpm infra:logs
```

Or:

```bash
docker compose logs -f
```

### Review service-specific logs

```bash
docker logs pipeline-kafka --tail 100
docker logs pipeline-mongodb --tail 100
docker logs pipeline-clickhouse --tail 100
docker logs pipeline-grafana --tail 100
```

### Rebuild images

Use this after modifying a Dockerfile or relevant build context:

```bash
docker compose build --no-cache
docker compose up -d
```

### MongoDB keyfile build errors

If a MongoDB image build fails with an error similar to:

```text
mongo-keyfile not found
```

verify all of the following:

1. `docker/mongodb/mongo-keyfile` exists before building.
2. The `COPY` path in the MongoDB Dockerfile matches the file location.
3. The Compose build context includes the keyfile.
4. The keyfile has restrictive permissions:

```bash
chmod 400 docker/mongodb/mongo-keyfile
```

### Docker Desktop memory pressure

This project runs Kafka, ZooKeeper, MongoDB, ClickHouse, Grafana, application services, and Docker Desktop's Linux VM. It is resource-intensive for a 16 GB machine.

For a Mac with 16 GB RAM:

- Set Docker Desktop memory to approximately **6–8 GB**.
- Leave at least **4 GB** available for macOS, the browser, the editor, and Terminal.
- Quit Docker Desktop completely when you are not actively running the project.
- Use `docker stats` to identify memory-heavy containers.

```bash
docker stats
```

The secondary Intel MacBook server experiment is currently deferred because the full stack is not stable enough within its available memory. The supported local workflow is to run the stack on the primary development Mac.

### Clean unused Docker resources

```bash
docker system prune
```

To also remove unused images:

```bash
docker system prune -a
```

> Be careful: `docker system prune -a` removes images that are not actively used by a container. You will need to pull or rebuild them again later.

### zsh inline-comment issue

Avoid pasting inline comments into an interactive zsh terminal:

```bash
docker compose up -d # start infrastructure
```

Depending on shell configuration, zsh may return:

```text
zsh: bad pattern: #
```

Prefer commands without inline comments:

```bash
docker compose up -d
pnpm install
pnpm dev:backend
```

## GitHub SSH Setup

Each computer should use its **own SSH key**. Adding a key for a secondary or serving Mac does not alter the GitHub SSH setup on the primary computer.

On a new machine:

```bash
ssh-keygen -t ed25519 -C "your-github-email@example.com"
pbcopy < ~/.ssh/id_ed25519.pub
```

Add the public key in:

```text
GitHub → Settings → SSH and GPG keys → New SSH key
```

Use a machine-specific title, for example:

```text
Serving MacBookPro13,3
```

Test authentication:

```bash
ssh -T git@github.com
```

Expected result:

```text
Hi YOUR_GITHUB_USERNAME! You've successfully authenticated,
but GitHub does not provide shell access.
```

## Common Commands

```bash
# Install workspace dependencies
pnpm install

# Type-check all workspace packages
pnpm typecheck

# Build all workspace packages
pnpm build

# Start or stop local infrastructure
pnpm infra:up
pnpm infra:down

# Follow infrastructure logs
pnpm infra:logs

# Start development services
pnpm dev:backend
pnpm dev:frontend

# Inspect resource consumption
docker stats

# Inspect Compose services
docker compose ps

# Reset all local infrastructure data (destructive)
docker compose down -v
```

## Testing and CI

The project includes unit and end-to-end tests for the full event pipeline.

```bash
# Run unit tests
pnpm test

# Start infrastructure and backend in separate terminals
pnpm infra:up
pnpm dev:backend

# Run the MongoDB → outbox → Kafka → ClickHouse integration suite
pnpm test:integration
```

GitHub Actions runs backend type-checking, production builds, unit tests, Docker Compose validation, and end-to-end pipeline tests on pushes and pull requests.

The CI workflow starts a clean Docker environment, initializes the MongoDB replica set, creates the `user-events` Kafka topic, starts ClickHouse, launches the compiled backend, and verifies event delivery through the analytics pipeline.

## Roadmap

- [ ] Add `schemaVersion` to every event contract
- [ ] Add idempotent analytics ingestion keyed by `eventId`
- [ ] Add a dead-letter topic for malformed events
- [ ] Add consumer lag and outbox operational metrics to Grafana
- [ ] Add automated integration tests with Docker Compose
- [ ] Add load generation and throughput benchmarks
- [ ] Add a feature-engineering and local ML scoring pipeline
- [ ] Document service-level memory limits for constrained development machines
- [ ] Add an architecture decision record for local hosting and deployment options

## License

This project is licensed under the [MIT License](LICENSE).

The MIT License permits commercial use, modification, distribution, sublicensing, and private use, provided that the copyright notice and license text are included in copies or substantial portions of the software. The software is provided without warranty.