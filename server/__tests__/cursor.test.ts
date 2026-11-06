import { describe, expect, it } from 'vitest';

import { cursorProvider } from '../src/providers/hook/cursor/cursor.js';
import { hookProviderById } from '../src/providers/index.js';

describe('cursorProvider', () => {
  it('is registered and has no transcript fallback', () => {
    expect(hookProviderById('cursor')).toBe(cursorProvider);
    expect(cursorProvider.id).toBe('cursor');
    expect(cursorProvider.displayName).toBe('Cursor');
    expect(cursorProvider.protocolVersion).toBe(1);
    expect(cursorProvider.getSessionDirs).toBeUndefined();
    expect(cursorProvider.sessionFilePattern).toBeUndefined();
    expect(cursorProvider.team).toBeUndefined();
  });

  describe('normalizeHookEvent', () => {
    it('returns null when the event name or session key is missing', () => {
      expect(cursorProvider.normalizeHookEvent({ conversation_id: 'conv-1' })).toBeNull();
      expect(cursorProvider.normalizeHookEvent({ hook_event_name: 'stop' })).toBeNull();
    });

    it('ignores unknown hook event names', () => {
      expect(
        cursorProvider.normalizeHookEvent({
          hook_event_name: 'beforeShellExecution',
          conversation_id: 'conv-1',
        }),
      ).toBeNull();
    });

    it('prefers conversation_id over session_id', () => {
      const result = cursorProvider.normalizeHookEvent({
        hook_event_name: 'stop',
        conversation_id: 'conv-a',
        session_id: 'shared-session',
      });
      expect(result?.sessionId).toBe('conv-a');
      expect(result?.event.kind).toBe('turnEnd');
    });

    it('falls back to session_id when conversation_id is absent', () => {
      const result = cursorProvider.normalizeHookEvent({
        hook_event_name: 'sessionEnd',
        session_id: 'sess-only',
        reason: 'exit',
      });
      expect(result?.sessionId).toBe('sess-only');
      if (result?.event.kind === 'sessionEnd') {
        expect(result.event.reason).toBe('exit');
      } else {
        expect.fail('expected sessionEnd');
      }
    });

    it('normalizes sessionStart without a transcript path', () => {
      const result = cursorProvider.normalizeHookEvent({
        hook_event_name: 'sessionStart',
        conversation_id: 'conv-1',
        workspace_roots: ['/work/app'],
        transcript_path: '/home/me/.cursor/projects/app/agent-transcripts/conv-1.jsonl',
        composer_mode: 'agent',
      });
      expect(result?.sessionId).toBe('conv-1');
      if (result?.event.kind === 'sessionStart') {
        expect(result.event.cwd).toBe('/work/app');
        expect(result.event.source).toBe('agent');
        expect(result.event.transcriptPath).toBeUndefined();
      } else {
        expect.fail('expected sessionStart');
      }
    });

    it('normalizes preToolUse, postToolUse, and postToolUseFailure', () => {
      const start = cursorProvider.normalizeHookEvent({
        hook_event_name: 'preToolUse',
        conversation_id: 'conv-1',
        tool_name: 'Read',
        tool_use_id: 'tu-1',
        tool_input: { path: '/work/app/office.ts' },
      });
      expect(start?.sessionId).toBe('conv-1');
      if (start?.event.kind === 'toolStart') {
        expect(start.event.toolName).toBe('Read');
        expect(start.event.toolId).toBe('tu-1');
        expect(start.event.input).toEqual({ path: '/work/app/office.ts' });
      } else {
        expect.fail('expected toolStart');
      }

      for (const name of ['postToolUse', 'postToolUseFailure'] as const) {
        const end = cursorProvider.normalizeHookEvent({
          hook_event_name: name,
          conversation_id: 'conv-1',
          tool_use_id: 'tu-1',
        });
        expect(end?.event.kind).toBe('toolEnd');
        if (end?.event.kind === 'toolEnd') expect(end.event.toolId).toBe('tu-1');
      }
    });

    it('normalizes stop as turnEnd', () => {
      const result = cursorProvider.normalizeHookEvent({
        hook_event_name: 'stop',
        conversation_id: 'conv-1',
      });
      expect(result?.event.kind).toBe('turnEnd');
    });

    it('normalizes subagentStart and subagentStop', () => {
      const start = cursorProvider.normalizeHookEvent({
        hook_event_name: 'subagentStart',
        conversation_id: 'conv-1',
        subagent_id: 'sub-9',
        subagent_type: 'explore',
        tool_call_id: 'call-1',
      });
      if (start?.event.kind === 'subagentStart') {
        expect(start.sessionId).toBe('conv-1');
        expect(start.event.toolId).toBe('sub-9');
        expect(start.event.toolName).toBe('explore');
        expect(start.event.parentToolId).toBe('call-1');
      } else {
        expect.fail('expected subagentStart');
      }

      const stop = cursorProvider.normalizeHookEvent({
        hook_event_name: 'subagentStop',
        conversation_id: 'conv-1',
        subagent_id: 'sub-9',
        tool_call_id: 'call-1',
      });
      if (stop?.event.kind === 'subagentEnd') {
        expect(stop.event.toolId).toBe('sub-9');
        expect(stop.event.parentToolId).toBe('call-1');
      } else {
        expect.fail('expected subagentEnd');
      }
    });
  });

  it('formats tool status from Cursor field names', () => {
    expect(cursorProvider.formatToolStatus('Read', { path: '/a/b.ts' })).toBe('Reading b.ts');
    expect(cursorProvider.formatToolStatus('Shell', { command: 'ls' })).toBe('Running: ls');
  });
});
