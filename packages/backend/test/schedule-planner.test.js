const test = require('node:test');
const assert = require('node:assert/strict');
const { previewSchedule } = require('../src/schedule-planner');

test('schedule preview filters by time and display group then reports conflict/winner', () => {
  const events = [
    { eventId: 1, eventName: 'Base', layoutId: 10, displayGroupIds: [7], fromDt: '2026-08-19T00:00:00Z', toDt: '2026-08-20T00:00:00Z', priority: 0 },
    { eventId: 2, eventName: 'Priority', layoutId: 20, displayGroupIds: [7], fromDt: '2026-08-19T10:00:00Z', toDt: '2026-08-19T12:00:00Z', priority: 10 },
    { eventId: 3, eventName: 'Other group', layoutId: 30, displayGroupIds: [9], fromDt: '2026-08-19T10:00:00Z', toDt: '2026-08-19T12:00:00Z' },
  ];
  const result = previewSchedule(events, { at: '2026-08-19T11:00:00Z', displayGroupId: 7 });
  assert.equal(result.matches.length, 2);
  assert.equal(result.conflict, true);
  assert.equal(result.winner.layoutId, 20);
});
