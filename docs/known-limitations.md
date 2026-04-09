# Known Limitations

Verified 2026-04-09.

## Coherence check doesn't log findings

`syncer.ts` coherence check compares MetaCache vs LanceDB file counts but doesn't log the actual numbers or outcome. Hard to debug after the fact. `gmax doctor` does show this (Cache Coherence section), but the syncer path during `gmax index` is silent.

## Doctor swallows index health errors

`doctor.ts` line ~361 has a bare `catch {}` around the entire index health check block. If LanceDB fails to open, the user sees "Could not check index health" with no reason.

## LLM server model mismatch not detected

`server.ts` `start()` adopts an existing llama-server if healthy, but doesn't verify the running model matches config. If someone restarts llama-server externally with a different model, gmax serves answers from the wrong model silently. The `healthy()` check does log a mismatch warning but doesn't restart.

## Project registry writes not serialized

`project-registry.ts` reads and writes `projects.json` without file-level locking. Concurrent `gmax add` from multiple terminals can corrupt the registry via interleaved read-modify-write.
