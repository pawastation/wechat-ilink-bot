# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0] - 2026-03-22

### Added

- iLink Bot HTTP API (getUpdates, sendMessage, getUploadUrl, getConfig, sendTyping)
- CDN media upload/download with AES-128-ECB encryption
- Message construction and sending (text, image, video, file)
- Context token management
- Long-polling with backoff, session guard, and flood protection
- QR code login flow (callback-based)
- Markdown to plain text conversion
- SILK to WAV transcoding (optional silk-wasm)
- Protocol type definitions
- 88 unit tests
