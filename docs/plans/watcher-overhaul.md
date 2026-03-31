# Watcher System Overhaul Plan

## Problem

The watcher system has grown organically across 9+ files with no unified lifecycle. Auto-indexing bypasses `gmax add` in 3 places, watchers spawn without registration checks, race conditions exist on multi-session startup, and stale state accumulates silently. The watcher registry uses a JSON file with no atomicity guarantees despite LMDB already being a dependency.

## Design Decisions from Research

1. **Use LMDB for watcher registry** (not JSON) — we already depend on `lmdb` (kriszyp/lmdb-js) which provides ACID transactions. This eliminates the race condition on concurrent reads/writes that plagues `watchers.json`. One `put()` in a transaction is atomic.

2. **Single daemon, not per-project processes** — chokidar v5 supports `watcher.add()` to dynamically add directory trees to a single instance. One daemon watching all registered projects uses fewer resources than N separate processes and eliminates the coordination problem entirely.

3. **`gmax add` is the only entry point for new projects** — no silent auto-indexing. MCP calls `gmax add` for unregistered projects. CLI search refuses. Watcher only watches registered projects.

## Principles

1. **`gmax add` is the only entry point** — no auto-indexing anywhere else
2. **One daemon, many projects** — single watcher process, dynamic add/remove
3. **LMDB for all state** — watcher registry moves from JSON to LMDB (atomic, crash-safe)
4. **Watcher requires registration** — won't watch unregistered projects
5. **Fail loud** — log errors, don't swallow spawn failures
6. **Registration is explicit** — not a side effect buried in `initialSync()`

---

## Phase 1: Gate all auto-index paths on registration

**Goal:** Make `gmax add` the single entry point. Remove all other auto-index paths.

### 1.1 `search --sync` must not auto-index unregistered projects
- **File:** `src/commands/search.ts`
- **Current:** `--sync` skips the registration check and runs `initialSync()` directly
- **Fix:** `--sync` only reindexes registered projects. If unregistered, print "run gmax add" regardless of `--sync`

### 1.2 Watcher must not `initialSync()` unregistered projects
- **File:** `src/commands/watch.ts:100-116`
- **Current:** If no indexed data found, watcher runs `initialSync()` directly
- **Fix:** Check project registry. If not registered, log warning and exit

### 1.3 SessionStart hook must check registration before starting watcher
- **File:** `plugins/grepmax/hooks/start.js:60-66`
- **Current:** Unconditionally calls `gmax watch -b`
- **Fix:** Read `projects.json` (or LMDB after Phase 3), check if CWD is registered. Only start if registered. MCP handles unregistered projects via `gmax add` on first search.

### 1.4 MCP `ensureWatcher` must check registration
- **File:** `src/commands/mcp.ts:340-348`
- **Current:** Spawns watcher without checking registration
- **Fix:** Check `getProject(projectRoot)` before spawning. Skip if not registered.

---

## Phase 2: Separate registration from indexing

**Goal:** `registerProject()` is explicit in callers, not a hidden side effect of `initialSync()`.

### 2.1 Remove `registerProject()` from `initialSync()`
- **File:** `src/lib/index/syncer.ts:540-554`
- **Current:** `registerProject()` called at end of `initialSync()` as side effect
- **Fix:** `initialSync()` returns `{ processed, indexed, total, failedFiles }`. Callers register explicitly.

### 2.2 Update all callers
| Caller | Current | After |
|--------|---------|-------|
| `add.ts` | Registers "pending" before, syncer registers "indexed" after | Registers "pending" before, updates to "indexed" after sync returns |
| `index.ts` | Relies on syncer side effect | Updates existing entry (lastIndexed, chunkCount) after sync |
| `watch.ts` | Relies on syncer side effect | Updates existing entry after sync |
| `search.ts --sync` | Relies on syncer side effect | Updates existing entry after sync |

---

## Phase 3: Move watcher registry from JSON to LMDB

**Goal:** Atomic watcher state, no race conditions, crash-safe.

### 3.1 Create `src/lib/utils/watcher-store.ts`
New LMDB-backed watcher registry replacing `watchers.json`:
- **Location:** `~/.gmax/cache/watchers.lmdb` (alongside `meta.lmdb`)
- **Schema:** key = project root, value = `WatcherInfo`
- Uses the same `lmdb` package as MetaCache
- All reads/writes are transactional — no more load→filter→push→save races

```typescript
export class WatcherStore {
  register(info: WatcherInfo): void       // atomic put
  unregister(projectRoot: string): void   // atomic remove
  get(projectRoot: string): WatcherInfo | undefined
  getAll(): WatcherInfo[]                 // prunes dead PIDs on read
  getCovering(dir: string): WatcherInfo | undefined
}
```

### 3.2 Add heartbeat
- `WatcherInfo` gains `lastHeartbeat: number`
- Watcher updates heartbeat every 60s
- `get()` treats heartbeat >5min stale as dead (even if PID alive — catches deadlocks)

### 3.3 Migrate existing code
- Replace all `watcher-registry.ts` imports with `watcher-store.ts`
- Delete `watchers.json` on first use of new store
- Files affected: `watch.ts`, `mcp.ts`, `index.ts`, `add.ts`, `search.ts`, `status.ts`, `start.js`

---

## Phase 4: Centralize watcher spawn logic

**Goal:** One function, one pattern, consistent behavior.

### 4.1 Create `src/lib/utils/watcher-launcher.ts`
```typescript
export function launchWatcher(projectRoot: string): { pid: number } | null
```

1. Checks project is registered → null if not
2. Checks no watcher already running (via WatcherStore) → returns existing PID if so
3. Spawns `gmax watch --path <root> -b`
4. Logs success or failure
5. Returns `{ pid }` or null

### 4.2 Replace all spawn sites
- `src/commands/add.ts` — after indexing
- `src/commands/mcp.ts` — ensureWatcher
- `src/commands/index.ts` — restart after reindex
- `src/commands/search.ts` — start after sync
- `plugins/grepmax/hooks/start.js` — SessionStart

---

## Phase 5: Single daemon architecture

**Goal:** One watcher process for all projects instead of N per-project processes.

### 5.1 IPC via Unix domain socket

**Socket:** `~/.gmax/daemon.sock`

The daemon listens on a Unix domain socket. CLI commands send JSON messages
and receive JSON responses. This gives us:
- Immediate feedback ("added" / "error") back to CLI
- Automatic crash detection (ECONNREFUSED = daemon dead)
- Clean concurrent handling from multiple Claude sessions
- ~130µs latency vs 2-10s for polling

**Protocol:**
```
→ {"cmd": "watch", "root": "/path/to/project"}
← {"ok": true}

→ {"cmd": "unwatch", "root": "/path/to/project"}
← {"ok": true}

→ {"cmd": "status"}
← {"ok": true, "projects": [{"root": "...", "status": "watching"}]}

→ {"cmd": "ping"}
← {"ok": true, "pid": 12345, "uptime": 3600}
```

**Stale socket cleanup:** On daemon startup, try connecting to existing socket.
If ECONNREFUSED, unlink and recreate. If connected, another daemon is alive — exit.

### 5.2 Daemon process (`gmax watch --daemon`)

**File:** `src/commands/watch.ts` (extend existing)

New `--daemon` flag starts multi-project mode:
1. Read all registered projects from `projects.json`
2. Create single chokidar instance with `watcher.add()` for each root
3. Listen on `~/.gmax/daemon.sock` for IPC commands
4. Register in LMDB watcher store (single entry, PID + "daemon" status)
5. Heartbeat every 60s (already implemented)
6. Idle timeout: 30min of no activity across ALL projects → shutdown

On IPC `watch` command:
- Call `chokidar.add(root)` on the existing watcher instance
- Update LMDB store

On IPC `unwatch` command:
- Call `chokidar.unwatch(root)`
- Update LMDB store

### 5.3 Daemon client utility

**New file:** `src/lib/utils/daemon-client.ts`

```typescript
export async function sendDaemonCommand(
  cmd: DaemonCommand,
): Promise<DaemonResponse>

export async function isDaemonRunning(): Promise<boolean>

export async function ensureDaemon(): Promise<void>
// If daemon not running, spawn gmax watch --daemon
// If running, return immediately
```

Uses `net.createConnection({ path: SOCKET_PATH })` to connect.
ECONNREFUSED → daemon is dead, spawn a new one.

### 5.4 Update callers

| Caller | Current | After |
|--------|---------|-------|
| `gmax add` | `launchWatcher(root)` | `ensureDaemon()` then `sendDaemonCommand({cmd: "watch", root})` |
| `gmax remove` | kill watcher PID | `sendDaemonCommand({cmd: "unwatch", root})` |
| `gmax index` | stop/restart per-project watcher | `sendDaemonCommand({cmd: "unwatch", root})`, index, then `sendDaemonCommand({cmd: "watch", root})` |
| MCP `ensureWatcher` | spawn per-project watcher | `ensureDaemon()` (daemon watches all registered) |
| SessionStart hook | `gmax watch -b` | `gmax watch --daemon` (if not already running) |
| `gmax watch status` | list per-project watchers | `sendDaemonCommand({cmd: "status"})` |
| `gmax watch stop` | kill per-project PID | `sendDaemonCommand({cmd: "shutdown"})` or kill daemon PID |

### 5.5 Backward compat

- `gmax watch --path <root> -b` still works for single-project mode
- `gmax watch --daemon` is the new multi-project mode
- `launchWatcher()` updated to prefer daemon mode: try IPC first,
  fall back to per-project spawn if daemon unavailable

### 5.6 Worker pool sharing

One worker pool (piscina) serves all projects. File processing results
are tagged with the project root (already the case — vectors store
absolute paths). No change to the embedding pipeline.

### 5.7 Files to create/modify

| File | Action |
|------|--------|
| `src/lib/utils/daemon-client.ts` | NEW — IPC client |
| `src/commands/watch.ts` | MODIFY — add `--daemon` mode with socket server |
| `src/lib/utils/watcher-launcher.ts` | MODIFY — prefer daemon, fallback to per-project |
| `src/commands/add.ts` | MODIFY — use daemon client |
| `src/commands/remove.ts` | MODIFY — use daemon client |
| `src/commands/index.ts` | MODIFY — use daemon client for stop/restart |
| `src/commands/mcp.ts` | MODIFY — ensureWatcher uses ensureDaemon |
| `plugins/grepmax/hooks/start.js` | MODIFY — start daemon, not per-project watcher |
| `src/lib/index/watcher.ts` | MODIFY — support multiple project roots |

### 5.8 Verification

1. `gmax add ~/proj1 && gmax add ~/proj2` → one daemon, two projects watched
2. `gmax watch status` → shows daemon PID with both roots
3. Kill daemon → next `gmax search` restarts it automatically
4. `gmax remove ~/proj1` → daemon unwatches, continues watching proj2
5. `gmax watch stop` → daemon shuts down cleanly, socket removed
6. Two Claude sessions → both connect to same daemon
7. `ps aux | grep gmax` → only one watcher process regardless of project count

---

## Phase 6: MCP ensureWatcher coverage

**Goal:** Watcher stays alive during any MCP tool use, not just search.

### 6.1 Call ensureWatcher from all tool handlers
- **Current:** Only called in `handleSemanticSearch()` (line 363)
- **Fix:** Call at top of every handler — skeleton, trace, symbols, related, recent, etc. It's cheap (one LMDB read).

---

## Phase 7: Logging consolidation

### 7.1 Move MLX server logs to `~/.gmax/logs/`
- **Current:** `/tmp/mlx-embed-server.log` and `/tmp/mlx-summarizer.log`
- **Fix:** `~/.gmax/logs/mlx-embed-server.log` with 5MB rotation

### 7.2 Unified log rotation
- Apply watch.ts rotation logic (5MB, keep `.prev`) to all log files

---

## Phase 8: Watcher resilience

### 8.1 Handle worker pool failure
- Clear pending files on pool failure (don't accumulate forever)
- Log the error
- Files re-detected on next change via mtime

### 8.2 Stop hook with verification
- Check PID after `gmax watch stop`
- SIGKILL if still alive after 3s

### 8.3 Chokidar crash recovery
- Chokidar re-emits `add` events on restart for files that changed during downtime (if mtime differs from initial scan)
- No need to persist pending queue — chokidar handles this via `ignoreInitial: false` on restart
- On watcher restart, `ready` event fires after full re-scan, catching missed changes

---

## Implementation Order

| Phase | Effort | Impact | Dependencies | Ship separately? |
|-------|--------|--------|-------------|-----------------|
| 1. Gate auto-index | Small | Critical | None | Yes — immediate fix |
| 2. Separate registration | Medium | High | Phase 1 | Bundle with Phase 1 |
| 4. Centralize spawn | Small | High | Phase 1 | Bundle with Phase 1 |
| 3. LMDB watcher store | Medium | High | Phase 4 | Yes — own PR |
| 6. MCP coverage | Trivial | Medium | Phase 4 | Bundle with Phase 3 |
| 7. Log consolidation | Trivial | Low | None | Yes — own PR |
| 8. Watcher resilience | Small | Medium | Phase 3 | Bundle with Phase 3 |
| 5. Single daemon | Large | High | Phase 3 | Future — own PR |

**PR 1:** Phases 1 + 2 + 4 — gate auto-index, separate registration, centralize spawn
**PR 2:** Phases 3 + 6 + 8 — LMDB watcher store, MCP coverage, resilience
**PR 3:** Phase 7 — log consolidation
**Future:** Phase 5 — single daemon

---

## Verification

After PR 1:
1. `gmax add .` → indexes, starts watcher, `.gmax.json` created
2. `gmax status` → shows project as "indexed" with "watching"
3. `gmax search "query" --sync` on unregistered project → "run gmax add" (not auto-index)
4. `gmax watch -b` on unregistered project → refuses to start
5. MCP search on new project → runs `gmax add`, watcher starts
6. `gmax remove . --force` → watcher stopped, data cleaned, entry gone
7. `gmax index` on registered project → reindexes, updates registry entry

After PR 2:
8. Open two Claude sessions on same project → only one watcher (LMDB atomic)
9. Kill watcher process → next `gmax status` shows "idle" (heartbeat stale)
10. Next search → watcher auto-relaunched
11. All MCP tools (skeleton, trace, etc.) keep watcher alive

After PR 3:
12. MLX logs in `~/.gmax/logs/` not `/tmp/`
13. All logs rotate at 5MB
