#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { program } from "commander";
import { installClaudeCode } from "./install/claude-code";
import { login } from "./login";
import { logout } from "./logout";
import { search } from "./search";
import { watch } from "./watch";

// utility functions moved to ./utils

program
  .version(
    JSON.parse(
      fs.readFileSync(path.join(__dirname, "../package.json"), {
        encoding: "utf-8",
      }),
    ).version,
  )
  .option(
    "--store <string>",
    "The store to use",
    process.env.MXBAI_STORE || "mgrep",
  );

program.addCommand(search, { isDefault: true });
program.addCommand(watch);
program.addCommand(installClaudeCode);
program.addCommand(login);
program.addCommand(logout);

program.parse();
