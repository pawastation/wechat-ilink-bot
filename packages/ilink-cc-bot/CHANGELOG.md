# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.2.0] - 2026-03-22

### Fixed

- Fix npm publish: use pnpm to correctly resolve `workspace:*` protocol
- Fix setup command path detection when running from source vs npm

### Added

- Typing indicator (sendTyping) while Claude is thinking
- Claude Code plugin metadata (.claude-plugin/plugin.json, .mcp.json)
- Bilingual README (EN/ZH)

## [0.1.0] - 2026-03-22

### Added

- MCP channel server bridging WeChat ↔ Claude Code
- Reply tool for Claude to send messages back to WeChat
- Typing indicator while Claude is thinking
- Inbound media download as local temp files
- CLI commands: login, start, setup
- Claude Code plugin metadata (.claude-plugin/plugin.json)
