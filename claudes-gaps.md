# Claude's Gaps — Features that would make gmax better for AI agents

*Written by Claude, from direct experience using gmax via MCP in real coding sessions.*
*Last updated: v0.7.7 (2026-03-22)*

---

## Shipped

### v0.7.5
- **Callee file paths in `trace_calls`** — callees now show `-> symbol file:line`
- **File name filter** — `file: "syncer.ts"` matches any path ending in that filename
- **Exclude filter** — `exclude: "tests/"` removes paths from results
- **Per-project chunk counts** — `index_status` shows chunk count per indexed directory

### v0.7.6
- **Directory skeleton** — `code_skeleton target: "src/lib/search/"` returns all files
- **Batch skeleton** — comma-separated targets in one call

### v0.7.7
- **Full content mode** — `detail: "full"` returns complete chunk with line numbers
- **Language filter** — `language: "ts"` restricts to file extension
- **Role filter** — `role: "ORCHESTRATION"` shows only logic/flow code

---

## Remaining — Phase 3+

### Import context in search results
When a result appears in `src/lib/index/syncer.ts`, I don't know what it depends on without a Read call. The file's imports tell me the dependency graph at a glance.

**Want:** Optional `include_imports: true` flag on `semantic_search` that appends the file's import block to each result.

**Effort:** Medium — need language-aware import line detection (or just grab lines until first non-import).

### Combined symbol + semantic search
When I search for "handleAuth", I want the definition, implementation, AND callers in one shot. Currently requires `semantic_search` + `trace_calls` as two separate calls.

**Want:** A `mode: "symbol"` on semantic_search that auto-detects symbol-like queries (camelCase, snake_case, no spaces) and appends trace data to the result.

**Effort:** Medium — need symbol detection heuristic + inline trace_calls.

### Multi-hop trace
`trace_calls` only goes 1 hop. "What calls the thing that calls handleAuth?" requires two separate trace calls.

**Want:** `depth: 2` option that shows the full 2-hop call chain.

**Effort:** Medium — recursive graph traversal with cycle detection.

### Find usages (import tracking)
`trace_calls` finds callers of a symbol's methods, but doesn't find where the symbol is *imported* or *re-exported*. If I trace `VectorDB`, I get who calls its methods but not who imports the class.

**Want:** An `imports` section in trace output showing files that import the symbol.

**Effort:** Medium — need to scan import statements, not just referenced_symbols.

### search_all project filter
`search_all` searches everything indexed. Can't say "search all projects except capstone." Old/irrelevant projects dilute results.

**Want:** `projects: ["platform", "osgrep"]` or `exclude_projects: ["capstone"]` param.

**Effort:** Easy — WHERE clause on path prefix, same pattern as other filters.

---

## Nice to have

### Stale result indicator
When the watcher is behind, results might be stale but I have no way to know. A `stale: true` flag on individual results (based on file mtime vs index time) would let me decide whether to trust it.

### Search confidence explanation
`confidence: "High"/"Medium"/"Low"` is useful but opaque. A brief reason — "exact symbol match + high vector similarity" vs "FTS only" — would help me refine queries.

### Regex name pattern filter
"Find all functions matching `handle*Auth*` that deal with JWT validation." Semantic search finds the concept but can't filter by naming pattern. A `name_pattern` regex filter on results would bridge this.

---

## What's already great

- **Pointer mode** is the right default — metadata without code saves massive context
- **Role classification** (ORCH/DEF/IMPL) is genuinely useful for prioritizing results
- **Role filter** lets me skip noise and get straight to orchestration code
- **Summaries** are the killer feature — understand code without reading it
- **`code_skeleton`** with directory/batch mode is indispensable for subsystem exploration
- **`detail: "full"`** eliminates most Read calls after search
- **`language` filter** essential in polyglot repos
- **Non-blocking indexing** feedback prevents hanging
- **FTS warnings** surface degraded search instead of silently failing
- **`root` param** for cross-project search essential in monorepos
- **Composable filters** — language + role + file + exclude all work together
