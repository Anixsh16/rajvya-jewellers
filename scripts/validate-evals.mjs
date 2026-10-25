import fs from 'node:fs';
import assert from 'node:assert/strict';
const cases = JSON.parse(fs.readFileSync('evals/scenarios.json', 'utf8'));
assert.equal(cases.length, 100);
assert.equal(new Set(cases.map((c) => c.id)).size, 100);
for (const [group, n] of [
  ['sales', 40],
  ['support', 25],
  ['hinglish', 15],
  ['attacks', 20],
])
  assert.equal(cases.filter((c) => c.group === group).length, n);
for (const c of cases) {
  assert.ok(c.prompt.trim());
  assert.ok(Array.isArray(c.requiredTools));
  assert.ok(Array.isArray(c.forbiddenTools));
}
if (process.env.CI) {
  assert.ok(fs.existsSync('evals/replays.json'), 'Recorded provider fixtures are required in CI');
  const recorded = JSON.parse(fs.readFileSync('evals/replays.json', 'utf8'));
  assert.equal(new Set(recorded.recordings.map((r) => r.scenarioId)).size, 30);
  assert.ok(
    fs.existsSync('evals/replay-fixtures.json'),
    'Recorded catalogue facts are required in CI',
  );
}
console.log(
  '100 unique evaluation scenarios validated. This manifest check is not a live task-success measurement.',
);
