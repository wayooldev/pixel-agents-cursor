## Purpose

Provides a one-click Windows desktop entry that keeps the existing Pixel Agents standalone server running on loopback and opens the same office SPA with a privileged session, without requiring the user to run npm or cd into the repo for daily use.

## ADDED Requirements

### Requirement: Launch opens the office UI

The desktop app MUST, after ensuring a compatible standalone server is available, load the Pixel Agents office SPA in its window at a loopback HTTP URL that includes the standalone auth token query parameter so the session is privileged.

#### Scenario: Cold start with no server running

- **WHEN** the user starts the desktop app and no compatible standalone Pixel Agents server is listening
- **THEN** the app starts the packaged standalone server on the configured fixed port and host `127.0.0.1`, waits until the server is healthy, and opens the office at `http://127.0.0.1:<port>/?token=<token>`

#### Scenario: Warm start with server already running

- **WHEN** the user starts the desktop app and a compatible standalone server is already alive on the configured port (or discovered via existing Pixel Agents server discovery)
- **THEN** the app MUST NOT spawn a second server process and MUST open the office using that server’s port and the persisted standalone token

### Requirement: No daily terminal workflow

The desktop app MUST be usable for opening the office without the user changing directory into the source repo or running `npm` / `npx` as part of normal daily use (build/install steps may still require those tools once).

#### Scenario: Daily open from shortcut

- **WHEN** the user launches the installed or staged app via desktop or taskbar shortcut
- **THEN** the office becomes available without additional terminal commands in that session

### Requirement: Reuse existing server and consent

The desktop app MUST use the existing standalone server and SPA consent/hooks flows; it MUST NOT introduce a separate consent path or a second protocol for Cursor (or Claude) hooks.

#### Scenario: Cursor hooks reach the same server

- **WHEN** Cursor hooks are installed and consented through the office UI while the desktop-backed server is running
- **THEN** hook events continue to POST only to `127.0.0.1` and are accepted by that standalone server as they are for `npx pixel-agents`

### Requirement: Owned-process shutdown

If the desktop app started the Node server child, closing the app MUST terminate that child. If the app reused a pre-existing server, closing the app MUST leave that server running.

#### Scenario: Quit after cold start

- **WHEN** the app spawned the server on this launch and the user closes the app
- **THEN** the spawned Node server process is stopped

#### Scenario: Quit after reuse

- **WHEN** the app reused an already-running standalone server and the user closes the app
- **THEN** that pre-existing server process remains running

### Requirement: Clear failure when Node or port is unavailable

When the app cannot start or attach to a standalone server because Node is missing/unusable or the configured port cannot be used, it MUST show a clear error to the user and MUST NOT leave the window indefinitely on a blank office.

#### Scenario: Node not on PATH

- **WHEN** the MVP relies on system Node and `node` is not available or fails the minimum version check
- **THEN** the app shows an actionable error explaining that Node is required

#### Scenario: Port blocked by unrelated process

- **WHEN** the configured fixed port is occupied by a process that is not a compatible Pixel Agents standalone server
- **THEN** the app shows an error and does not treat that listener as the office server

### Requirement: Packaging documentation

The change MUST document how to build the app, where the icon/shortcut is expected, and which Node process (command and args) the app launches.

#### Scenario: Reader can rebuild locally

- **WHEN** a developer follows the desktop packaging documentation after a successful product `package` build
- **THEN** they can produce a runnable Windows app that opens the office without reverse-engineering the repo
