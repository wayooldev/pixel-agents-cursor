## Purpose

Brings Cursor Agent sessions (editor Agent/Composer chats and local `cursor-agent` CLI activity that emit Cursor hooks) into Pixel Agents as office characters, using opt-in official hooks and one character per active conversation.

## ADDED Requirements

### Requirement: Opt-in Cursor hook install

The system SHALL install Cursor hook configuration only after explicit user consent (or an explicit settings toggle that constitutes consent). Until consent is granted, the system MUST NOT modify `~/.cursor/hooks.json`.

#### Scenario: First-run consent granted

- **WHEN** the user grants Cursor hooks consent in the Pixel Agents UI
- **THEN** the system writes only Pixel Agents–owned hook entries for the supported Cursor events into `~/.cursor/hooks.json`, preserves unrelated third-party hook entries, and creates a one-time backup of the prior file when modifying an existing hooks file

#### Scenario: Consent declined

- **WHEN** the user declines Cursor hooks consent
- **THEN** the system leaves `~/.cursor/hooks.json` unchanged and does not deliver Cursor agent characters via hooks

### Requirement: Reversible uninstall

The system SHALL provide a way to remove Pixel Agents–owned Cursor hook entries and MUST leave third-party hook entries intact.

#### Scenario: Uninstall via settings or extension uninstall

- **WHEN** the user disables Instant Detection (Hooks) for Cursor, or the extension uninstall hook runs
- **THEN** Pixel Agents–owned Cursor hook commands are removed from `~/.cursor/hooks.json` and non–Pixel Agents entries remain

### Requirement: Localhost-only event delivery

Cursor hook scripts installed by Pixel Agents SHALL deliver hook payloads only to Pixel Agents servers on `127.0.0.1` (or equivalent loopback), authenticated with the server token. The system MUST NOT send Cursor hook payloads to non-loopback destinations as part of this capability.

#### Scenario: Hook fires while server is running locally

- **WHEN** Cursor emits a supported hook event and a live Pixel Agents server is registered on loopback
- **THEN** the hook script POSTs the event to that server’s Cursor hooks endpoint on loopback with the bearer token

#### Scenario: No live local server

- **WHEN** Cursor emits a hook event and no live Pixel Agents server registry entry is available
- **THEN** the hook script exits without error and does not attempt remote delivery

### Requirement: One character per Cursor conversation

The system SHALL map each distinct Cursor conversation/session identifier from hook payloads to at most one primary office character, so concurrent conversations appear as multiple characters.

#### Scenario: Two concurrent conversations

- **WHEN** Cursor delivers hook events for two different conversation ids while Pixel Agents is running
- **THEN** the office shows two distinct primary characters whose activity tracks their respective conversations

#### Scenario: Single conversation

- **WHEN** only one Cursor conversation emits hook events
- **THEN** the office shows one primary character for that conversation

### Requirement: Subagent characters when Cursor reports them

When Cursor emits subagent start/stop hook events, the system SHALL represent those subagents as child characters linked to the parent conversation’s character.

#### Scenario: Subagent starts

- **WHEN** a `subagentStart` (or equivalent normalized) event arrives for a known parent conversation
- **THEN** a child character appears associated with that parent session

#### Scenario: Subagent stops

- **WHEN** a matching subagent stop event arrives
- **THEN** the corresponding child character is ended/removed according to existing Pixel Agents subagent lifecycle rules

### Requirement: Supported Cursor hook events

The system SHALL normalize at least these Cursor hook events into Pixel Agents agent events when present: session start/end, pre/post tool use (including failure), subagent start/stop, and stop/turn end. Unsupported or unknown hook event names MUST be ignored without failing the hook pipeline.

#### Scenario: Tool use updates activity

- **WHEN** a pre-tool-use event arrives with a tool name for a known conversation
- **THEN** the corresponding character’s activity status updates to reflect that tool use

#### Scenario: Unknown hook event

- **WHEN** a hook payload contains an unrecognized event name
- **THEN** the system ignores it and does not crash or uninstall hooks

### Requirement: No transcript-file primary detection

This capability MUST NOT use Cursor `agent-transcripts` JSONL (or similar chat transcript files) as the primary detection path for Cursor Agent activity.

#### Scenario: Hooks installed

- **WHEN** Cursor hooks are installed and consent is granted
- **THEN** character activity for Cursor agents is driven by hook events, not by reading agent transcript files

### Requirement: Claude provider unchanged

Adding Cursor hooks MUST NOT remove or alter Claude Code hook behavior already provided by Pixel Agents.

#### Scenario: Both providers consented

- **WHEN** Claude Code hooks and Cursor hooks are both installed
- **THEN** Claude sessions and Cursor conversations can appear as characters according to their respective providers
