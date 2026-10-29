export function parseContentSections(content: string) {
  const lines = (content || '').split('\n').filter(Boolean);
  const overview = lines.slice(0, 3).join('\n');
  return { overview, full: content || '' };
}
