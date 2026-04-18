# Known Limitations

Verified 2026-04-09.

## Zombie daemons survive singleton check

The PID-file singleton check (`daemon.ts:63-80`) only examines one PID. If a daemon is orphaned through the lock-compromise path and a subsequent daemon overwrites the PID file, the orphan becomes invisible to future startup checks. Observed 2026-04-09: PID 40956 (8+ hours old, 872 MB RSS, 11 open LanceDB index handles) running alongside active daemon 54611.

**Impact:** Wasted memory, stale file descriptors pinning compacted LanceDB fragments (prevents full disk reclamation).

**Workaround:** `pgrep -x gmax-daemon` to find orphans, kill manually.

**Fix:** Replace PID-file check with `pgrep -x gmax-daemon` process scan at startup (see triage-2026-04-09.md).
