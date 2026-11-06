/**
 * Cursor (and URI-shaped payloads) often send Windows paths as `/C:/Users/...`.
 * That string does not exist on disk, so tracking and Debug View both lie.
 */
export function normalizeHookWorkspacePath(raw: string): string {
  let p = raw.trim();
  if (!p) return p;
  if (/^file:/i.test(p)) {
    try {
      const withoutScheme = p.replace(/^file:\/\//i, '');
      p = decodeURIComponent(withoutScheme.replace(/^\/([A-Za-z]:)/, '$1'));
    } catch {
      /* keep p */
    }
  }
  const drive = /^[/\\]([A-Za-z]:)([/\\].*)?$/.exec(p);
  if (drive) {
    p = drive[1] + (drive[2] ?? '');
  }
  return p;
}
