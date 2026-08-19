function previewSchedule(events, { at = new Date(), displayGroupId = null } = {}) {
  const instant = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(instant.getTime())) throw new Error('invalid preview date');
  const group = displayGroupId == null || displayGroupId === '' ? null : Number(displayGroupId);
  const matches = (Array.isArray(events) ? events : []).filter(event => {
    const start = parseDate(event.fromDt ?? event.fromDate ?? event.startDt ?? event.start);
    const end = parseDate(event.toDt ?? event.toDate ?? event.endDt ?? event.end);
    if (start && instant < start) return false;
    if (end && instant > end) return false;
    if (group != null && Number.isFinite(group)) {
      const groups = normalizeGroups(event);
      if (groups.length && !groups.includes(group)) return false;
    }
    return true;
  }).map(event => ({
    eventId: event.eventId ?? event.id ?? null,
    eventName: event.eventName ?? event.name ?? '',
    layoutId: Number(event.layoutId ?? event.campaignId ?? 0) || null,
    priority: Number(event.priority ?? event.isPriority ?? 0) || 0,
    fromDt: event.fromDt ?? event.fromDate ?? null,
    toDt: event.toDt ?? event.toDate ?? null,
    raw: event,
  })).sort((a, b) => b.priority - a.priority || Number(a.eventId || 0) - Number(b.eventId || 0));
  return { at: instant.toISOString(), displayGroupId: group, matches, conflict: matches.length > 1, winner: matches[0] || null };
}

function normalizeGroups(event) {
  const raw = event.displayGroupIds ?? event.displayGroups ?? event.displayGroupId ?? [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values.flatMap(value => {
    if (typeof value === 'number') return [value];
    if (typeof value === 'string') return value.split(',').map(item => Number(item.trim())).filter(Number.isFinite);
    if (value && typeof value === 'object') return [Number(value.displayGroupId ?? value.id)].filter(Number.isFinite);
    return [];
  });
}
function parseDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
module.exports = { previewSchedule, normalizeGroups, parseDate };
