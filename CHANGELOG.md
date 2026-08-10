# Changelog

All notable changes to the Real-Time Event Pipeline are documented in this file.

This project follows a lightweight adaptation of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are added when the project reaches a meaningful, releasable milestone.

## [Unreleased]

### Added

- Documentation structure under `docs/`:
  - `architecture.md`
  - `event-contract.md`
  - `local-development.md`
  - `operations-runbook.md`
  - `roadmap.md`
  - `testing.md`
- `README_LOCAL.md` for machine-specific and local-only setup guidance.
- `CHANGELOG.md` as the historical record for project development.
- Local-environment troubleshooting guidance for:
  - Docker Desktop memory pressure on constrained macOS hardware.
  - Node.js version management with `nvm`.
  - GitHub SSH authentication on a second Mac.
  - Interactive zsh errors caused by pasted inline comments.
- Repository-level project assets:
  - Grafana dashboard screenshot.
  - Coverage badge generation script.
  - GitHub Actions CI and Docker Compose build workflows.

### Changed

- Standardized the preferred Node.js development runtime on Node 24.x through `nvm`.
- Established Docker Desktop on macOS as the preferred local infrastructure host.
- Deferred use of the secondary Intel MacBook as a dedicated serving host because Docker Desktop plus the full Kafka, MongoDB, ClickHouse, and Grafana stack is not reliably sustainable within its available memory.
- Clarified that development should continue locally on the primary development machine until a more appropriate dedicated hosting option is selected.
- Updated local GitHub access guidance so each computer uses an independent SSH key registered to the same GitHub account.

### Documentation

- Expanded local setup guidance for:
  - Docker Compose lifecycle commands.
  - MongoDB replica-set initialization.
  - Kafka topic verification.
  - Container log inspection.
  - Docker resource monitoring.
  - Cleanup of unused Docker resources.
- Documented the MongoDB keyfile requirement and build-context failure mode.
- Documented the recommended workflow for validating the end-to-end MongoDB → outbox → Kafka → ClickHouse pipeline.

## [0.1.0] - 2026-08-10

### Added

- React and Vite frontend for generating typed product and user-behavior events.
- Node.js, Express, and TypeScript backend API.
- Zod validation at the API boundary.
- MongoDB transactional outbox implementation:
  - `raw_events` collection for source events.
  - `event_outbox` collection for durable publish intents.
  - Background relay with locking, retries, exponential backoff, and lock recovery.
- Kafka producer integration using `userId` as the stable message key.
- Kafka `user-events` topic with local topic initialization support.
- MongoDB replica-set configuration for transaction and change-stream support.
- ClickHouse Kafka-engine ingestion.
- ClickHouse materialized-view transformation into a durable MergeTree analytics table.
- Grafana analytics dashboard support for:
  - Event volume over time.
  - Event-type distribution.
  - Top event types.
  - Recent pipeline activity.
- Protected manual outbox requeue endpoint for local reliability and duplicate-delivery testing.
- Docker Compose infrastructure for:
  - Kafka.
  - ZooKeeper.
  - MongoDB.
  - ClickHouse.
  - Grafana.
  - MongoDB initialization.
  - Kafka topic initialization.
- pnpm workspace configuration for frontend and backend packages.
- Unit tests for event validation.
- End-to-end integration tests for MongoDB → outbox → Kafka → ClickHouse delivery.
- GitHub Actions workflows for CI, coverage reporting, and Docker Compose builds.

### Reliability

- Implemented at-least-once event publication from the MongoDB outbox to Kafka.
- Designed downstream processing around `eventId` as the idempotency key.
- Added manual requeue support to deliberately test duplicate delivery.
- Added outbox status reporting for pending, processing, published, and failed records.
- Added operational reconciliation between published MongoDB outbox events and ClickHouse analytics records.

### Documentation

- Added project README covering:
  - Architecture.
  - Local setup.
  - API usage.
  - Outbox behavior.
  - ClickHouse analytics queries.
  - Grafana panel configuration.
  - Failure recovery testing.
  - CI workflow.
- Added architecture, event-contract, operations, testing, and roadmap documentation.