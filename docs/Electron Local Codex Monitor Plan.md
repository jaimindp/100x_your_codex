# Electron Local Codex Monitor Plan (Draft)

## Goal
Build a local-first Electron app that reconstructs a developer timeline from Codex telemetry and git activity, with token usage, estimated cost, and health monitoring, without GitHub auth.

## Non-Goals
- No dependency on GitHub API or OAuth.
- No claim of invoice-grade billing accuracy.
- No cloud backend in MVP.

## Core Product Outcome
Someone installs the app, points it at local repos and `~/.codex`, and immediately sees:
1. What happened and when (commands, prompts, commits, merges, branch/worktree actions).
2. Where usage went (models, token usage, repo/project concentration).
3. Estimated cost (clearly labeled estimate).
4. Health status (data pipeline, runtime, rate-limit, repo state).

## Local Data Sources
1. `~/.codex/history.jsonl`
2. `~/.codex/sessions/**/*.jsonl`
3. `~/.codex/state_5.sqlite`
4. Local git repos (tracked roots):
   - `git log --all --date=iso-strict`
   - `git reflog --all --date=iso`
   - `git worktree list --porcelain`
   - `git status --porcelain`
   - `git rev-list --left-right --count @{upstream}...HEAD` (when upstream exists)

## MVP Screens
1. Overview
   - Active sessions, tokens today, estimated cost today, health score.
2. Timeline
   - Unified event feed with filters: repo, branch, source, event type, time range.
3. Usage
   - Model mix, token trend, sessions/day, top repos.
4. Git
   - Branches, worktrees, merge events, uncommitted changes, ahead/behind.
5. Health
   - Data freshness, parser error rate, process/liveness, rate-limit pressure.
6. Settings
   - Paths, refresh interval, token pricing table, privacy toggles.

## Canonical Event Model
Create a normalized local store (SQLite):

`timeline_events`
1. `id` (text primary key)
2. `ts` (integer unix seconds)
3. `source` (`codex|git|system`)
4. `repo_path` (text nullable)
5. `worktree_path` (text nullable)
6. `branch` (text nullable)
7. `event_type` (text)
8. `title` (text)
9. `details_json` (text JSON)
10. `session_id` (text nullable)
11. `thread_id` (text nullable)
12. `sha` (text nullable)

`token_usage_rollups`
1. `bucket_start_ts`
2. `model`
3. `input_tokens`
4. `cached_input_tokens`
5. `output_tokens`
6. `reasoning_tokens`
7. `total_tokens`
8. `estimated_cost_usd`

`ingest_state`
1. `source_name`
2. `last_cursor` (file offset/reflog hash/timestamp)
3. `last_success_ts`
4. `last_error`

## Cost Strategy
1. Read per-turn token events from Codex logs (`payload.type == "token_count"`).
2. Maintain local pricing table in settings:
   - model, input_rate, cached_input_rate, output_rate, reasoning_rate.
3. Compute:
   - `estimated_cost = in*in_rate + cached*cached_rate + out*out_rate + reasoning*reasoning_rate`
4. UI label everywhere: `Estimated cost from local telemetry`.

## Health Strategy
Health score from weighted checks:
1. Data health
   - Last ingest age, malformed lines, parse failure rate.
2. Runtime health
   - Collector process alive, ingest loop latency, DB write failures.
3. Rate-limit health
   - Bucket usage percent, reset windows, credits flags (if available).
4. Git health
   - Dirty worktrees count, stale branches, detached HEAD/worktree anomalies.

## Implementation Plan (Hackathon Pace)
## Phase 1 (2-3 hours): Ingestion Backbone
1. Initialize Electron + Vite + React + TypeScript.
2. Add local SQLite DB for app data.
3. Build ingestion workers:
   - Codex JSONL parser (history + sessions).
   - Git collector (log, reflog, worktrees, status).
4. Persist normalized `timeline_events` + basic rollups.

Exit criteria:
1. DB contains events from at least one repo and one Codex session.
2. Incremental re-run does not duplicate events.

## Phase 2 (2-3 hours): MVP UI
1. Overview cards.
2. Timeline table/list with filters.
3. Usage charts (model mix + token trend).
4. Git panel (branches/worktrees/dirty state).

Exit criteria:
1. App loads under 2s on cached data.
2. Timeline filter interactions feel instant (<150ms on typical dataset).

## Phase 3 (1-2 hours): Health + Polish
1. Add Health screen + simple score.
2. Add Settings for paths/pricing/refresh interval.
3. Add empty/loading/error states.
4. Add demo fixture mode (sample dataset) if local data missing.

Exit criteria:
1. Fresh install can be demoed in under 60s.
2. Health indicators are understandable without explanation.

## Engineering Choices
1. Main process collectors; renderer reads from app DB via IPC only.
2. Polling first (every 5-15s), optional file watch later.
3. Idempotent ingestion keys:
   - Codex events: hash(file_path + byte_offset + timestamp + type)
   - Git events: hash(repo + ts + event_type + sha + message)
4. Keep all sensitive data local; no outbound telemetry by default.

## Risks and Mitigations
1. Incomplete command history:
   - Mitigation: prioritize Codex tool events + reflog, clearly mark confidence.
2. Token schema variation between versions:
   - Mitigation: resilient parser with optional fields + schema version logging.
3. Very large local history:
   - Mitigation: incremental cursors + batched inserts + indexed queries.
4. Cost mismatch vs actual billing:
   - Mitigation: explicit estimate label + configurable rates + assumptions panel.

## Demo Script (2 minutes)
1. Open Overview: show tokens today, estimated cost, health.
2. Open Timeline: filter to one repo and one hour window.
3. Show merge + branch switch + Codex prompt/command sequence.
4. Open Usage: model split and token trend.
5. Open Health: show parser/data/runtime status.

## Nice-to-Have (Post-MVP)
1. Local PR inference from commit messages (`#123`, `Merge pull request`).
2. Obsidian link-out from repo/project events.
3. Dependency graph per project.
4. Export timeline to CSV/JSON.

## Definition of Done
1. Fully local app, no GitHub auth required.
2. Unified timeline from Codex + git is working and filterable.
3. Token usage and estimated cost visible by model and time window.
4. Health page reports meaningful operational status.
5. Demo can be run from clean start in one command.
