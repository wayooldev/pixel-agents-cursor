# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities through [GitHub's private vulnerability reporting](https://github.com/wayooldev/pixel-agents-cursor/security/advisories/new) on **this** repository.

If the issue also affects upstream Pixel Agents, we may ask you to report it there as well: [pixel-agents-hq/pixel-agents advisories](https://github.com/pixel-agents-hq/pixel-agents/security/advisories/new).

**Do not open a public issue for security vulnerabilities.** Never paste standalone `?token=` URLs or full hook payloads with secrets.

We will acknowledge your report within 7 days and aim to release a fix within 30 days of confirmation.

## Scope

Security issues relevant to this project include:

- Command injection via terminal spawning, hook scripts, or JSONL parsing
- Arbitrary file read/write beyond intended paths (including `~/.cursor/hooks.json` installers)
- Cross-site scripting (XSS) in the webview / desktop WebView2
- Sensitive data exposure (terminal output, session content, standalone bearer token)
- Desktop sidecar spawn / path handling on Windows
