# Codex Usage Deep Dive (Local Forensics)

Generated: `2026-02-28 11:27:14 +08`  
Host-local scope: files under `~/.codex`, `~/Library/Application Support/Codex`, `~/Library/Caches/com.openai.codex`, `~/Library/Logs/com.openai.codex`, and running local processes.

	## Executive Summary

Your machine has a very complete local Codex telemetry footprint. The highest-value sources are:

1. `~/.codex/history.jsonl`: user prompt history (plain text).
2. `~/.codex/sessions/**/*.jsonl`: full session event streams (turn context, tool calls, token/rate-limit events).
3. `~/.codex/state_5.sqlite`: structured thread metadata (cwd, git branch, git origin, git SHA, tokens used, titles, timestamps) and runtime logs.
4. `~/.codex/log/codex-tui.log`: detailed operational logs.

You can reconstruct:

1. Recent prompts and sessions.
2. Active/active-ish threads.
3. Models used over time.
4. Repo roots, branches, remotes, and some commit SHAs.
5. Token/rate-limit telemetry.

You cannot get a clean invoice-grade USD billing ledger locally from these files.

---

## 1) Primary Local Artifacts

| Path | Format | What it contains | Why it matters |
|---|---|---|---|
| `/Users/jaimin/.codex/history.jsonl` | JSONL | `session_id`, `ts`, `text` | Fastest way to view recent user queries. |
| `/Users/jaimin/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | JSONL event log | `session_meta`, `turn_context`, `response_item`, `event_msg` | Deepest per-session evidence: model, cwd, token events, tool calls. |
| `/Users/jaimin/.codex/state_5.sqlite` | SQLite | `threads`, `logs`, agent/job tables | Best structured source for branch/repo/workspace/token summaries and active thread detection. |
| `/Users/jaimin/.codex/log/codex-tui.log` | Text log | Runtime internals, tool-call traces, model cache behavior | Useful for timeline/debug correlation. |
| `/Users/jaimin/.codex/models_cache.json` | JSON | Cached model catalog | Shows known models and refresh timing. |
| `/Users/jaimin/.codex/config.toml` | TOML | Default model, feature flags, trusted projects | Shows configured behavior and trusted roots. |
| `/Users/jaimin/.codex/.codex-global-state.json` | JSON | active/saved workspace roots and UI state | Shows current root focus in desktop context. |
| `/Users/jaimin/.codex/auth.json` | JSON | Local auth/session credentials | Sensitive auth material. |
| `/Users/jaimin/.codex/tmp/arg0` | Temp dirs/locks | Tool execution scratch dirs + `.lock` files | Strong real-time tool activity signal. |
| `/Users/jaimin/.codex/shell_snapshots/*.sh` | Shell snapshot | Captured shell env/functions at session start | Operational context, not primary usage ledger. |

### Current footprint snapshot

1. `history_lines=12658`
2. `session_files=1611`
3. `threads=1608`
4. `logs_rows=5055`
5. `jobs_rows=0`
6. `shell_snapshots=81`
7. `codex_tui_log_bytes=152718246`

---

## 2) macOS Desktop-App Side Artifacts

| Path | Format | Notes |
|---|---|---|
| `/Users/jaimin/Library/Application Support/Codex` | Chromium app data tree | Cache/session/local-storage/crashpad/sentry artifacts. |
| `/Users/jaimin/Library/Caches/com.openai.codex` | Cache | Sparkle updater cache and installer artifacts. |
| `/Users/jaimin/Library/Logs/com.openai.codex` | Log files | Desktop logs present but sparse for usage accounting. |

Important: most of `Application Support/Codex` is Chromium/browser infrastructure and is less direct than `~/.codex` for forensic usage analysis.
At verification time, LOCK-file handle checks were `0`, suggesting the desktop app profile was not actively writing those lock targets.

---

## 3) Data Formats and Schemas

## 3.1 `history.jsonl` schema

One JSON per line. Observed keys:

1. `session_id`
2. `ts` (unix epoch seconds)
3. `text` (user prompt text)

## 3.2 Session event logs (`~/.codex/sessions/...jsonl`)

Observed top-level event object:

1. `timestamp`
2. `type`
3. `payload`

Observed event types in a sampled active session:

1. `session_meta`
2. `turn_context`
3. `response_item`
4. `event_msg`

`turn_context.payload` commonly includes:

1. `cwd`
2. `approval_policy`
3. `sandbox_policy`
4. `model`
5. `collaboration_mode`
6. `effort`
7. `summary`
8. `user_instructions`
9. `turn_id`
10. `truncation_policy`
11. `personality`

## 3.3 `state_5.sqlite` key tables

`threads` columns include:

1. `id`
2. `rollout_path`
3. `created_at`, `updated_at`
4. `source`, `model_provider`
5. `cwd`, `title`
6. `sandbox_policy`, `approval_mode`
7. `tokens_used`
8. `archived`, `archived_at`
9. `git_sha`, `git_branch`, `git_origin_url`
10. `cli_version`, `first_user_message`
11. `agent_nickname`, `agent_role`, `memory_mode`

`logs` columns include:

1. `ts`, `ts_nanos`
2. `level`, `target`, `message`
3. `thread_id`, `process_uuid`
4. `file`, `line`, `module_path`

---

## 4) How To Look Things Up (Command Cookbook)

## 4.1 Recent user queries

```bash
tail -n 50 ~/.codex/history.jsonl | jq -r '[.session_id, (.ts|todateiso8601), .text] | @tsv'
```

## 4.2 Active/active-ish sessions (recent log activity)

```bash
NOW=$(date +%s); CUTOFF=$((NOW-900))
sqlite3 -header -column ~/.codex/state_5.sqlite "
SELECT thread_id, MAX(datetime(ts,'unixepoch','localtime')) AS last_seen_local, COUNT(*) AS events
FROM logs
WHERE thread_id IS NOT NULL AND ts >= $CUTOFF
GROUP BY thread_id
ORDER BY MAX(ts) DESC;"
```

More direct "currently active" signal from thread metadata:

```bash
sqlite3 -header -column ~/.codex/state_5.sqlite "
SELECT id, datetime(updated_at,'unixepoch') AS updated_utc, cwd, git_branch, tokens_used, rollout_path
FROM threads
WHERE updated_at >= strftime('%s','now') - 300
ORDER BY updated_at DESC;"
```

Live file-handle check:

```bash
lsof ~/.codex/state_5.sqlite ~/.codex/state_5.sqlite-wal ~/.codex/log/codex-tui.log | grep codex
```

## 4.3 Which models were used

```bash
jq -r 'select(.type=="turn_context") | .payload.model // empty' \
  ~/.codex/sessions/2026/02/*/*.jsonl \
  ~/.codex/sessions/2026/01/*/*.jsonl \
  ~/.codex/sessions/2025/*/*/*.jsonl 2>/dev/null \
| sort | uniq -c | sort -nr
```

## 4.4 Which roots/repos/branches were used

```bash
# Working directories (roots)
sqlite3 -header -column ~/.codex/state_5.sqlite \
"SELECT cwd, COUNT(*) thread_count FROM threads GROUP BY cwd ORDER BY thread_count DESC LIMIT 30;"

# Branches
sqlite3 -header -column ~/.codex/state_5.sqlite \
"SELECT git_branch, COUNT(*) thread_count
 FROM threads
 WHERE git_branch IS NOT NULL AND git_branch!=''
 GROUP BY git_branch
 ORDER BY thread_count DESC;"

# Git remotes
sqlite3 -header -column ~/.codex/state_5.sqlite \
"SELECT git_origin_url, COUNT(*) thread_count
 FROM threads
 WHERE git_origin_url IS NOT NULL AND git_origin_url!=''
 GROUP BY git_origin_url
 ORDER BY thread_count DESC;"
```

## 4.5 Token/rate-limit telemetry

```bash
# Rate-limit bucket IDs seen in token_count events
jq -r 'select(.type=="event_msg" and .payload.type=="token_count")
      | (.payload.rate_limits.limit_id // "<none>")' \
  ~/.codex/sessions/2026/02/*/*.jsonl \
  ~/.codex/sessions/2026/01/*/*.jsonl \
  ~/.codex/sessions/2025/*/*/*.jsonl 2>/dev/null \
| sort | uniq -c | sort -nr

# Credits flags and balance presence
jq -r 'select(.type=="event_msg" and .payload.type=="token_count")
      | [.payload.rate_limits.credits.has_credits,
         .payload.rate_limits.credits.unlimited,
         (.payload.rate_limits.credits.balance // "null")] | @tsv' \
  ~/.codex/sessions/2026/02/*/*.jsonl \
  ~/.codex/sessions/2026/01/*/*.jsonl \
  ~/.codex/sessions/2025/*/*/*.jsonl 2>/dev/null
```

## 4.6 Current workspace roots and trusted project map

```bash
rg -n '^\[projects\.' ~/.codex/config.toml
jq -r '.["active-workspace-roots"][]? // empty' ~/.codex/.codex-global-state.json
jq -r '.["electron-saved-workspace-roots"][]? // empty' ~/.codex/.codex-global-state.json
```

---

## 5) Active Sessions (Observed During Collection)

At collection time, recent log activity showed active-ish thread IDs including:

1. `019ca22c-d5bd-7151-8056-13e386aa94d8`
2. `019ca22d-8a37-7331-95e2-4fdf4b7093a1`
3. `019ca22d-8a51-74d3-b43b-65a90c3cea22`
4. `019ca22d-8a56-7bf1-bca2-e98f57cd1b46`
5. `019ca22a-6bf1-7c23-83be-c3dbf4ca7ff6`

Running local codex processes observed (latest sample): `43` (includes long-lived/resumed sessions).

Note: this is dynamic and should always be refreshed from `state_5.sqlite.logs` + `ps`.

---

## 6) Token Management and Cost Visibility

## 6.1 What is available locally

1. Per-turn/session token telemetry in `event_msg` where `payload.type=="token_count"`:
   - `total_token_usage` (input/cached/output/reasoning/total)
   - `last_token_usage`
   - `rate_limits` (bucket IDs, used percentages, windows, resets)
   - `credits` (`has_credits`, `unlimited`, `balance`)
2. Per-thread aggregate `tokens_used` in `state_5.sqlite.threads`.

## 6.2 What was observed

Rate-limit IDs seen historically:

1. `codex_bengalfox`: `143594`
2. `<none>`: `115847`
3. `codex`: `72582`

Credits flags historically:

1. `false|false`: `325026`
2. `true|false`: `6395`
3. blank/malformed rows: `602`
4. Distinct non-null `credits.balance` values seen historically: `1504`

Thread-level token aggregate snapshot:

1. `threads=1608`
2. `SUM(tokens_used)=12032616821`
3. `AVG(tokens_used)=7482970.66`
4. `MAX(tokens_used)=239915077`

Structured billing-key scan summary (historical local corpus):

1. `price` key occurrences: `3` (contextual text/event payloads, not ledger rows)
2. `cost`: `0`
3. `request_id`: `0`

## 6.3 Cost conclusion

Local files do not provide a clean invoice-grade USD cost ledger per request/session.  
You do have strong local usage telemetry (tokens + limits + credit states), but not a straightforward billing export.

---

## 7) Observed Usage Patterns

## 7.1 Model mix (turn-context occurrences)

1. `gpt-5.3-codex`: `152812`
2. `gpt-5.2-codex`: `75103`
3. `gpt-5.1-codex-mini`: `18478`
4. `gpt-5.2`: `1082`
5. `gpt-5.1-codex`: `291`
6. `gpt-5.1-codex-max`: `122`
7. `gpt-5-codex`: `11`

Per-session first-turn-context model mix (reduces multi-turn skew; sessions with turn-context parsed: `1332`):

1. `gpt-5.3-codex`: `551`
2. `gpt-5.2-codex`: `493`
3. `gpt-5.1-codex-mini`: `240`
4. `gpt-5.1-codex`: `21`
5. `gpt-5.2`: `17`
6. `gpt-5.1-codex-max`: `9`
7. `gpt-5-codex`: `1`

## 7.2 Workspace concentration (`threads.cwd`)

Top path: `/Users/jaimin/Documents/Obsidian/Monarch/Code` with `1145` threads.  
Secondary roots include `/Users/jaimin/Documents/Obsidian/Monarch` (`219`) and `/Users/jaimin/Documents/Monarch/Code` (`66`).

## 7.3 Branch usage (`threads.git_branch`)

Top branches:

1. `main` (`43`)
2. `marina-audit` (`19`)
3. `hip1` (`18`)
4. `mon-115-raw-input-capture-s3-catalog` (`12`)

Coverage note:

1. Threads with branch captured: `115/1608`
2. Threads with origin URL captured: `115/1608`
3. This means most sessions are not in git-detected contexts (or branch/origin not captured at thread creation).

## 7.4 Repo remote usage (`threads.git_origin_url`)

Top remotes:

1. `https://github.com/MonarchFast/monarch.git` (`52`)
2. `https://github.com/jaimindp/monarch_contracts.git` (`44`)
3. `https://github.com/jaimindp/learn_chinese.git` (`8`)
4. `https://github.com/MonarchFast/backend.git` (`7`)

## 7.5 Session volume by day (top observed dates)

1. `2026-02-25`: `115` session files
2. `2026-02-24`: `98`
3. `2026-02-05`: `91`
4. `2026-02-13`: `71`
5. `2026-02-06`: `69`

---

## 8) Exact Local Locations (Quick Map)

Primary Codex root:

1. `/Users/jaimin/.codex`

Subpaths of interest:

1. `/Users/jaimin/.codex/history.jsonl`
2. `/Users/jaimin/.codex/sessions`
3. `/Users/jaimin/.codex/state_5.sqlite`
4. `/Users/jaimin/.codex/log/codex-tui.log`
5. `/Users/jaimin/.codex/models_cache.json`
6. `/Users/jaimin/.codex/config.toml`
7. `/Users/jaimin/.codex/.codex-global-state.json`
8. `/Users/jaimin/.codex/shell_snapshots`
9. `/Users/jaimin/.codex/sqlite/codex-dev.db` (automation/inbox tables; currently empty)

Desktop app paths:

1. `/Users/jaimin/Library/Application Support/Codex`
2. `/Users/jaimin/Library/Caches/com.openai.codex`
3. `/Users/jaimin/Library/Logs/com.openai.codex`

---

## 9) What Is Not Reliably Stored Locally

1. Clean per-request USD cost records.
2. A guaranteed single "active session" file/flag (activity is inferred from logs/processes).
3. Complete billing plan metadata (many `plan_type` values observed as null).

---

## 10) Security/Privacy Notes

These files contain sensitive operational data:

1. Raw prompts and assistant outputs.
2. Repo paths, branch names, and remotes.
3. Potentially internal instructions and tool outputs.

Treat `~/.codex` as sensitive telemetry storage.

Additional high-sensitivity files to protect:

1. `/Users/jaimin/.codex/auth.json`
2. `/Users/jaimin/.codex/history.jsonl`
3. `/Users/jaimin/.codex/sessions/**/*.jsonl`
4. `/Users/jaimin/.codex/.codex-global-state.json`

---

## 11) Portability and Monitoring Addendum

This section captures the missing cross-machine and ops details so future audits do not rely on host-specific assumptions.

## 11.1 `CODEX_HOME` and `CODEX_SQLITE_HOME` resolution

1. Primary state root is `CODEX_HOME`, defaulting to `~/.codex`.
2. SQLite location can be overridden with `CODEX_SQLITE_HOME` (or equivalent config `sqlite_home`).
3. If SQLite home is overridden, do not assume DB files are under `~/.codex`.
4. On this host, the active DB is still under `~/.codex` (`state_5.sqlite` + WAL/SHM).

Portable check:

```bash
echo "CODEX_HOME=${CODEX_HOME:-$HOME/.codex}"
echo "CODEX_SQLITE_HOME=${CODEX_SQLITE_HOME:-<unset>}"
```

## 11.2 Retention and credential-store controls

High-impact config knobs to include in governance reviews:

1. `history.persistence = "save-all" | "none"`
2. `history.max_bytes = <integer>`
3. `cli_auth_credentials_store = "file" | "keyring" | "auto"`

Interpretation:

1. `history.persistence="none"` reduces local prompt history retention.
2. `history.max_bytes` constrains growth of persisted history when enabled.
3. `cli_auth_credentials_store` controls whether credentials live in local files (for example `auth.json`) versus OS keychain/keyring.

## 11.3 Live monitoring beyond tailing JSONL

Beyond `tail -f` on rollout files:

1. `codex resume --all` provides a fast session inventory from CLI metadata/indexing.
2. If app-server mode is in use, monitor loaded-thread/status APIs (for example loaded thread list and status change notifications).
3. Use `threads.updated_at` recency queries from `state_5.sqlite` as local ground truth.
4. Use `lsof` on `state_5.sqlite`/WAL and `codex-tui.log` to confirm active writes.
5. Use process-list correlation (`codex` plus wrapper `node` processes).

## 11.4 Non-interactive telemetry capture (`codex exec --json`)

For clean forward-looking usage telemetry, prefer JSONL output from non-interactive execution:

```bash
codex exec --json "do X" | jq -c 'select(.type=="turn.completed")'
```

Why this helps:

1. It emits structured per-turn completion records.
2. Token fields are easier to parse than mixed interactive rollout streams.
3. It is better for building reproducible usage and cost-estimation pipelines.

## 11.5 macOS portability notes

Avoid Linux/GNU-only shell assumptions in runbooks:

1. `find -printf` is not portable to default macOS/BSD `find`.
2. Prefer `find ... | xargs ls -lt` for recent-file ordering.
3. Prefer `stat -f` (BSD form) instead of GNU `stat -c`.
4. Validate any scripted forensic command on macOS before relying on it in incident response.
