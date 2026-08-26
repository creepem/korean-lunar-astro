// Full-sweep regression: every day from 1900-01-01 to 2100-12-31 (73,414 days)
// against a frozen fixture of expected lunar dates.
// Fixture line format: "YYYY-MM-DD ly-lm-ld[L]"
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { solarToLunar } from '../dist/esm/index.js';

test('golden sweep 1900-2100', () => {
  const raw = gunzipSync(readFileSync(new URL('./fixtures/golden-1900-2100.txt.gz', import.meta.url)))
    .toString('utf8');
  let checked = 0;
  const bad = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const [solar, lunarStr] = line.trim().split(' ');
    const [y, m, d] = solar.split('-').map(Number);
    const leap = lunarStr.endsWith('L');
    const [ly, lm, ld] = (leap ? lunarStr.slice(0, -1) : lunarStr).split('-').map(Number);
    const got = solarToLunar(y, m, d);
    if (got.year !== ly || got.month !== lm || got.day !== ld || got.isLeapMonth !== leap) {
      bad.push(`${solar}: expected ${lunarStr}, got ${got.year}-${got.month}-${got.day}${got.isLeapMonth ? 'L' : ''}`);
      if (bad.length > 20) break;
    }
    checked++;
  }
  assert.deepEqual(bad, [], `mismatches (first ${bad.length})`);
  assert.equal(checked, 73414);
});
