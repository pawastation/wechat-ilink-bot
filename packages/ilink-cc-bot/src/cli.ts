#!/usr/bin/env node
/**
 * CLI entry point for @pawastation/ilink-cc-bot.
 *
 * Usage:
 *   npx @pawastation/ilink-cc-bot login    # QR code login
 *   npx @pawastation/ilink-cc-bot start    # Start MCP channel server (used by Claude Code)
 *   npx @pawastation/ilink-cc-bot setup    # Print .mcp.json configuration
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const command = process.argv[2];

switch (command) {
  case "login":
    await import("./login.js");
    break;

  case "start":
    await import("./channel.js");
    break;

  case "setup": {
    // Detect: are we running from npm (npx/global install) or from source?
    const thisFile = fileURLToPath(import.meta.url);
    const isFromNodeModules = thisFile.includes("node_modules");

    let config;
    if (isFromNodeModules) {
      // Published package — use npx
      config = {
        mcpServers: {
          wechat: {
            command: "npx",
            args: ["@pawastation/ilink-cc-bot", "start"],
          },
        },
      };
    } else {
      // Local development — use absolute path to the compiled dist/channel.js
      const srcDir = path.dirname(thisFile);
      const pkgDir = path.resolve(srcDir, "..");
      const channelPath = path.resolve(pkgDir, "dist", "channel.js");
      config = {
        mcpServers: {
          wechat: {
            command: "node",
            args: [channelPath],
          },
        },
      };
    }

    console.log("Add the following to your project's .mcp.json:\n");
    console.log(JSON.stringify(config, null, 2));
    console.log("\nOr run:");
    console.log(`  claude mcp add wechat -- ${config.mcpServers.wechat.command} ${config.mcpServers.wechat.args.join(" ")}`);
    console.log("\nThen start Claude Code with:");
    console.log("  claude --dangerously-load-development-channels server:wechat");
    break;
  }

  default:
    console.log(`@pawastation/ilink-cc-bot - WeChat channel for Claude Code

Commands:
  login    Scan QR code to connect your WeChat account
  start    Start the MCP channel server (used by Claude Code)
  setup    Print .mcp.json configuration

Usage:
  npx @pawastation/ilink-cc-bot login
  npx @pawastation/ilink-cc-bot setup
`);
    if (command) {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
}
