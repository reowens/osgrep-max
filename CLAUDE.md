# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow — MANDATORY

1. **All changes to main go through PRs.** No direct merges, no direct pushes to main. Ever.
2. **Never squash merge.** Use `gh pr merge` with no flags. Individual commits matter.
3. **Never run destructive git commands** (`reset --hard`, `push --force`, `checkout .`, `clean -f`) without the user explicitly requesting that specific command.
4. **If git state looks wrong, STOP.** Describe the problem. Do not try to fix it autonomously.

## Commands

```bash
pnpm build          # tsc → dist/
pnpm test           # vitest run
pnpm test:watch     # vitest watch mode
pnpm typecheck      # tsc --noEmit
pnpm format         # biome check --write .
pnpm lint           # biome lint .
```

## Release / Deploy

```bash
npm version patch   # bump version, commit, tag, push, and publish (fully automated)
```

This single command runs the full pipeline via npm lifecycle hooks:
1. `preversion` — runs tests + typecheck
2. `version` — syncs plugin.json + marketplace.json versions, stages all
3. `postversion` — pushes commit + tag, creates GitHub release, watches CI, installs globally

Use `minor` or `major` instead of `patch` as needed.

Run a single test file:
```bash
npx vitest run tests/intent.test.ts
```

## Architecture

grepmax is a semantic code search CLI tool (CLI command: `gmax`). It indexes source code into vector embeddings and searches by meaning rather than exact string matching.

### Centralized Index

All data lives in `~/.gmax/`:
- `~/.gmax/lancedb/` — LanceDB vector store (one database for all indexed directories)
- `~/.gmax/cache/meta.lmdb` — file metadata cache (content hashes, mtimes)
- `~/.gmax/config.json` — global config (model tier, embed mode)
- `~/.gmax/models/` — embedding models
- `~/.gmax/grammars/` — Tree-sitter grammars
- `~/.gmax/projects.json` — registry of indexed directories

All chunks store **absolute file paths**. Search scoping is done via path prefix filtering. There are NO `.gmax/` directories inside projects.

### Pipeline

1. **Walk** (`src/lib/index/walker.ts`) — traverses repo respecting `.gitignore` / `.gmaxignore`
2. **Chunk** (`src/lib/index/chunker.ts`) — splits files by function/class boundaries using Tree-sitter grammars
3. **Embed** (`src/lib/workers/`) — generates 384-dim dense vectors (Granite model via ONNX or MLX) and ColBERT reranking vectors via a piscina worker pool
4. **Store** (`src/lib/store/vector-db.ts`) — writes vectors to centralized LanceDB, file metadata to LMDB (`meta-cache.ts`)
5. **Search** (`src/lib/search/searcher.ts`) — multi-stage: vector search → FTS → RRF fusion → cosine rerank → structural boosting → deduplication
6. **Graph** (`src/lib/graph/graph-builder.ts`) — call graph from `defined_symbols` / `referenced_symbols` in indexed chunks
7. **Skeleton** (`src/lib/skeleton/skeletonizer.ts`) — Tree-sitter based file summarization (signatures only, bodies collapsed)

### MCP Server

`gmax mcp` runs an in-process MCP server over stdio. It searches the centralized VectorDB directly — no HTTP daemon needed.

Tools: `semantic_search`, `search_all`, `code_skeleton`, `trace_calls`, `list_symbols`, `index_status`, `summarize_directory`, `summarize_project`, `related_files`, `recent_changes`

### Embedding Modes

Defaults to GPU (MLX) on Apple Silicon, CPU (ONNX) elsewhere. Override with `gmax serve --cpu` or `gmax setup`. Both modes produce compatible 384-dim vectors from the same Granite model — switching modes doesn't require reindexing.

### Plugin System

The Claude Code plugin lives in `plugins/grepmax/`. SessionStart hook starts the MLX server if needed.

## Key Types

- `VectorRecord` — a single indexed chunk with embedding, metadata, symbols, role
- `ChunkType` — search result with score, confidence, role classification (ORCHESTRATION / DEFINITION / IMPLEMENTATION)
- `SearchIntent` — query classifier (DEFINITION / FLOW / USAGE / ARCHITECTURE / GENERAL)

## Version Sync

Plugin and marketplace versions must match `package.json`. The release process is:

1. `npm version patch|minor|major` — bumps `package.json`, commits, and creates a git tag
2. `bash scripts/sync-versions.sh` — syncs `plugin.json` and `marketplace.json` to the new version
3. Amend the version commit to include the synced files
4. Push commit + tags to trigger release CI

The release CI validates that all version files match.
