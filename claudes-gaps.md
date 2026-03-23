# Claude's Gaps — Completed

*Written by Claude, from direct experience using gmax via MCP in real coding sessions.*
*All items shipped as of v0.7.19 (2026-03-23)*

---

## All shipped

### v0.6.3–v0.6.5 — Bug fixes
- SIGINT handling in index command
- Insert-before-delete in watcher
- Watcher retry backoff + limits
- FTS resilience (retry + warnings)
- SQL escaping standardization
- MCP root path validation
- Worker respawn cap
- Unhandled promise catch in MCP
- Replace pkill with serve stop
- gracefulExit in setup

### v0.7.1 — Production polish
- Help system overhaul (program name, descriptions, examples, grouping)
- `gmax config` command
- README rewrite (env vars, config docs, .gmaxignore)
- SKILL.md comprehensive update

### v0.7.2–v0.7.4 — MCP reliability
- Non-blocking MCP indexing with progress feedback
- Plugin hooks fix (MLX server path resolution)
- Spawn background index process (no lock contention with CLI)

### v0.7.5 — Search filters + trace improvements
- `file` filter (match by filename)
- `exclude` filter (exclude path prefix)
- Callee file paths in trace_calls
- Per-project chunk counts in index_status

### v0.7.6 — Skeleton enhancements
- Directory skeleton (`code_skeleton target: "src/lib/search/"`)
- Batch skeleton (comma-separated targets)

### v0.7.7 — Search power features
- `detail: "full"` (complete chunk with line numbers)
- `language` filter (by file extension)
- `role` filter (ORCHESTRATION/DEFINITION/IMPLEMENTATION)

### v0.7.8 — Cross-project search
- `projects` / `exclude_projects` for search_all

### v0.7.9 — Navigation improvements
- Skeleton line numbers (source line annotations)
- Symbol type + export info in list_symbols
- `context_lines` param (surrounding lines like grep -C)

### v0.7.10 — Combined search
- `mode: "symbol"` (semantic search + call graph in one call)

### v0.7.11 — Project overview
- `summarize_project` tool (languages, structure, roles, key symbols, entry points)

### v0.7.12 — Dependency visibility
- `include_imports` param (prepend file imports to search results)

### v0.7.13 — Deep tracing
- Multi-hop trace (`depth: 2-3` for callers-of-callers)

### v0.7.14 — File relationships
- `related_files` tool (dependencies + dependents by shared symbols)

### v0.7.15 — Performance
- 100x faster walker (eliminated realpathSync bottleneck)

### v0.7.16 — Import tracking
- "Imported by" section in trace_calls output

### v0.7.17 — Structured output
- `format: "json"` on code_skeleton (structured symbol list)

### v0.7.18 — Recent changes
- `recent_changes` tool (recently modified files by mtime)

### v0.7.19 — Pattern matching
- `name_pattern` regex filter on search results

---

## Final stats

- **11 MCP tools**: semantic_search, search_all, code_skeleton, trace_calls, list_symbols, index_status, summarize_directory, summarize_project, related_files, recent_changes + mode:"symbol"
- **16 search params**: query, limit, root, path, detail, context_lines, min_score, max_per_file, file, exclude, language, role, mode, include_imports, name_pattern, projects/exclude_projects
- **22 releases** in one session (v0.6.2 → v0.7.19)

---

## What's great

- **Pointer mode** — metadata without code saves massive context
- **Role classification + filter** — skip noise, find orchestration code
- **Summaries** — understand code without reading it
- **`code_skeleton`** with directory/batch/JSON mode — indispensable
- **`detail: "full"` + `context_lines`** — eliminates most Read calls
- **`mode: "symbol"`** — search + trace in one call
- **`summarize_project`** — instant codebase overview
- **`related_files`** — know what to look at when editing
- **`recent_changes`** — focus on what's actively changing
- **`trace_calls` with depth + imports** — full dependency picture
- **`name_pattern`** — bridges semantic + pattern matching
- **Composable filters** — all params work together
- **Non-blocking indexing** with progress feedback
- **100x faster walker** — no more blocking realpathSync
