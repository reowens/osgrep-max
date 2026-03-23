# Claude's Gaps — Features that would make gmax better for AI agents

*Written by Claude, from direct experience using gmax via MCP in real coding sessions.*

---

## Priority 1 — Eliminate follow-up searches

### Callee file paths in `trace_calls`
Callers show `<- symbol file:line` but callees are bare names: `Calls: validateToken, checkRole, respond`. I can't navigate to callees without a second `semantic_search` or `list_symbols` call. Every trace result triggers 2-3 follow-up lookups.

**Want:** `Calls: validateToken (src/auth/jwt.ts:12), checkRole (src/rbac/index.ts:45)`

### File name filter on `semantic_search`
The `path` param is a prefix match on the full path. When I know the filename but not the directory, I can't use it. `path: "syncer.ts"` matches nothing because the full path is `src/lib/index/syncer.ts`.

**Want:** A `file` param that matches against the basename: `file: "syncer.ts"` → matches `src/lib/index/syncer.ts`

---

## Priority 2 — Save context window

### Directory skeleton
`code_skeleton` only accepts a single file. I frequently need the skeleton of an entire directory to understand a subsystem — `code_skeleton src/lib/search/` — before deciding which file to read. Currently requires N separate calls for N files.

**Want:** `target: "src/lib/search/"` returns concatenated skeletons for all files in the directory, sorted by relevance or alphabetically.

### Search results with import context
When a result appears in `src/lib/index/syncer.ts`, I don't know what it depends on without a Read call. The file's imports tell me the dependency graph at a glance.

**Want:** Optional `include_imports: true` flag on `semantic_search` that appends the file's import block to each result. Even just the module names (not full paths) would help.

---

## Priority 3 — Better debugging & filtering

### Per-project chunk counts in `index_status`
Currently shows total chunks across all projects. When I'm debugging "why did search return nothing," I need to know if this specific project has 0 chunks or 5000. Have to mentally subtract from the total.

**Want:** Each project in the directory listing shows its chunk count: `osgrep /Users/.../osgrep 2026-03-22 (1,847 chunks)`

### Exclude paths from search
There's `path` to include but no way to exclude. In monorepos, test files and generated code dominate results. I want "everything in src/ except test files and mocks."

**Want:** `exclude: "tests/,__mocks__/,*.test.ts"` param on `semantic_search`.

---

## Priority 4 — Reduce round-trips

### Combined symbol + semantic search
When I search for "handleAuth", I want:
1. The definition (where it's declared)
2. The implementation (what it does)
3. The callers (who uses it)

Currently requires `semantic_search` + `trace_calls` as two separate calls. A `mode: "symbol"` on semantic_search that automatically includes trace data would cut this to one call.

### Batch skeleton
When exploring a new area, I call `code_skeleton` 3-5 times on related files. A batch mode accepting multiple targets would reduce round-trips: `targets: ["src/auth/handler.ts", "src/auth/jwt.ts", "src/auth/rbac.ts"]`.

---

## Priority 5 — Nice to have

### Stale result indicator
When the watcher is behind or the index hasn't been updated in hours, results might be stale but I have no way to know. A `stale: true` flag on individual results (based on file mtime vs indexed-at time) would let me decide whether to trust the result or Read the file directly.

### Search result confidence explanation
The `confidence: "High"` / `"Medium"` / `"Low"` label is useful but opaque. A brief reason — "High: exact symbol match + high vector similarity" vs "Low: only FTS match, no vector similarity" — would help me decide whether to trust the result or refine my query.

### Regex-aware search
Sometimes I need hybrid: "find all functions matching `handle*Auth*` that deal with JWT validation." Semantic search finds the concept but can't filter by naming pattern. A `name_pattern` regex filter on results would bridge this gap.

---

## What's already great

- **Pointer mode** is the right default — metadata without code saves massive context
- **Role classification** (ORCH/DEF/IMPL) is genuinely useful for prioritizing results
- **Summaries** are the killer feature — I can understand what code does without reading it
- **`code_skeleton`** is indispensable for large files — I use it constantly
- **Non-blocking indexing** feedback ("indexing in progress") prevents me from hanging
- **FTS warnings** tell me when search quality is degraded instead of silently failing
- **`root` param** for cross-project search is essential in monorepos
