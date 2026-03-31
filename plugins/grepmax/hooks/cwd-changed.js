const fs = require("node:fs");
const _path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    // If no stdin arrives within 1s, proceed with empty input
    setTimeout(() => resolve({}), 1000);
  });
}

function isProjectRegistered(dir) {
  try {
    const projectsPath = _path.join(
      require("node:os").homedir(),
      ".gmax",
      "projects.json",
    );
    if (!fs.existsSync(projectsPath)) return false;
    const projects = JSON.parse(fs.readFileSync(projectsPath, "utf-8"));
    return projects.some((p) => dir.startsWith(p.root));
  } catch {
    return false;
  }
}

function isGitRepo(dir) {
  try {
    // Walk up to find .git (handles worktrees and nested repos)
    let current = dir;
    while (current !== _path.dirname(current)) {
      if (fs.existsSync(_path.join(current, ".git"))) return true;
      current = _path.dirname(current);
    }
    return false;
  } catch {
    return false;
  }
}

async function main() {
  const input = await readStdin();
  const newCwd = input.new_cwd || process.cwd();

  // Already indexed — nothing to do
  if (isProjectRegistered(newCwd)) return;

  // Only auto-add git repos
  if (!isGitRepo(newCwd)) return;

  // Spawn `gmax add` fully detached so it doesn't block the hook timeout
  try {
    const child = spawn("gmax", ["add", newCwd], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // gmax not in PATH or spawn failed — silently ignore
    return;
  }

  // Tell Claude that indexing is starting
  const dirName = _path.basename(newCwd);
  const response = {
    hookSpecificOutput: {
      hookEventName: "CwdChanged",
      additionalContext: `gmax: indexing "${dirName}" in background. Search results may be incomplete until indexing finishes. Run Bash(gmax status) to check progress.`,
    },
  };
  process.stdout.write(JSON.stringify(response));
}

main();
