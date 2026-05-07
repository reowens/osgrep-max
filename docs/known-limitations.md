# Known Limitations

Last updated 2026-05-07.

## Zombie daemons survive singleton check

Verified 2026-04-09.

The PID-file singleton check (`daemon.ts:63-80`) only examines one PID. If a daemon is orphaned through the lock-compromise path and a subsequent daemon overwrites the PID file, the orphan becomes invisible to future startup checks. Observed 2026-04-09: PID 40956 (8+ hours old, 872 MB RSS, 11 open LanceDB index handles) running alongside active daemon 54611.

**Impact:** Wasted memory, stale file descriptors pinning compacted LanceDB fragments (prevents full disk reclamation).

**Workaround:** `pgrep -x gmax-daemon` to find orphans, kill manually.

**Fix:** Replace PID-file check with `pgrep -x gmax-daemon` process scan at startup (see triage-2026-04-09.md).

## LanceDB manifest references a missing fragment file

Verified 2026-05-07.

After an interrupted compaction, the LanceDB manifest can reference a fragment file (`<hash>.lance`) that no longer exists on disk. Symptoms in `~/.gmax/logs/daemon.log`:

```
[watch:<project>] DATA CORRUPTION: LanceDB manifest references a missing fragment.
Backing off this project's batch processor for 30 min. To repair, run: gmax index --reset
```

The daemon's batch processor (since v0.16.0, commit `fd05089`) detects this via `isLanceCorruptionError()` and backs off for 30 minutes per affected project, logging once per hour. Read-path queries (search/peek/extract/etc.) continue to work — only the write path (incremental reindex) is paused.

**Impact:** New file changes in the affected project stop being indexed until repair. Search results gradually go stale.

**Recovery:**
```bash
cd <affected-project-root>
gmax index --reset
```

This rebuilds the project's vectors from scratch. For a 100k-chunk project on Apple Silicon, expect ~5–15 minutes.

**Detection (manual):**
```bash
grep "DATA CORRUPTION" ~/.gmax/logs/daemon.log | tail
```

**Fix:** None planned. Compaction interrupts (laptop sleep mid-write, kill -9, disk pressure) are rare enough that the detect-and-back-off behavior is sufficient.
