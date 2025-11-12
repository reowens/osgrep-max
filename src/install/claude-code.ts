import { exec } from "child_process";
import { Command } from "commander";
import { loginAction } from "../login";

function installPlugin() {
  exec("claude plugin marketplace add mixedbread-ai/mgrep", (error) => {
    if (error) {
      console.error(`Error installing plugin: ${error}`);
      process.exit(1);
    }
    console.log(
      "Successfully added the mixedbread-ai/mgrep plugin to the marketplace",
    );
    exec("claude plugin install mgrep", (error) => {
      if (error) {
        console.error(`Error installing plugin: ${error}`);
        process.exit(1);
      }
      console.log("Successfully installed the mgrep plugin");
    });
  });
}

export const installClaudeCode = new Command("install-claude-code")
  .description("Install the Claude Code plugin")
  .action(async () => {
    await loginAction();
    await installPlugin();
  });
