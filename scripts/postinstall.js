#!/usr/bin/env node
/**
 * Postinstall: sync plugin files to all installed integrations.
 * Runs after `npm install -g grepmax@latest` to automatically update
 * skills, hooks, and configs without manual re-installation.
 *
 * Supported integrations:
 * - Claude Code: sync skills/hooks to plugin cache
 * - OpenCode: re-run installer (regenerates tool shim + plugin)
 * - Codex: re-run installer (updates AGENTS.md + MCP registration)
 * - Factory Droid: re-run installer (updates skills + hooks)
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execSync } = require("node:child_process");

const sourcePlugin = path.join(__dirname, "..", "plugins", "grepmax");

// --- Claude Code: sync files to plugin cache ---
const pluginCacheBase = path.join(
  os.homedir(),
  ".claude",
  "plugins",
  "cache",
  "grepmax",
  "grepmax",
);

if (fs.existsSync(pluginCacheBase) && fs.existsSync(sourcePlugin)) {
  let entries;
  try {
    entries = fs.readdirSync(pluginCacheBase, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const versionDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        copyRecursive(path.join(src, entry), path.join(dest, entry));
      }
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  for (const ver of versionDirs) {
    const destDir = path.join(pluginCacheBase, ver);
    try {
      copyRecursive(
        path.join(sourcePlugin, "skills"),
        path.join(destDir, "skills"),
      );
      copyRecursive(
        path.join(sourcePlugin, "hooks"),
        path.join(destDir, "hooks"),
      );
      const hooksJson = path.join(sourcePlugin, "hooks.json");
      if (fs.existsSync(hooksJson)) {
        fs.copyFileSync(hooksJson, path.join(destDir, "hooks.json"));
      }
    } catch {
      // Best-effort
    }
  }
}

// --- OpenCode: re-run installer if tool shim or plugin exists ---
const ocToolPath = path.join(
  os.homedir(),
  ".config",
  "opencode",
  "tool",
  "gmax.ts",
);
const ocPluginPath = path.join(
  os.homedir(),
  ".config",
  "opencode",
  "plugins",
  "gmax.ts",
);
if (fs.existsSync(ocToolPath) || fs.existsSync(ocPluginPath)) {
  try {
    execSync("gmax install-opencode", { stdio: "ignore", timeout: 10000 });
  } catch {}
}

// --- Codex: re-run installer if AGENTS.md has gmax skill ---
const codexAgentsPath = path.join(os.homedir(), ".codex", "AGENTS.md");
if (fs.existsSync(codexAgentsPath)) {
  try {
    const content = fs.readFileSync(codexAgentsPath, "utf-8");
    if (content.includes("gmax")) {
      execSync("gmax install-codex", { stdio: "ignore", timeout: 10000 });
    }
  } catch {}
}

// --- Factory Droid: re-run installer if skill exists ---
const droidSkillPath = path.join(
  os.homedir(),
  ".factory",
  "skills",
  "gmax",
  "SKILL.md",
);
if (fs.existsSync(droidSkillPath)) {
  try {
    execSync("gmax install-droid", { stdio: "ignore", timeout: 10000 });
  } catch {}
}
