import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getGanji } from '../dist/esm/index.js';

test('known year/month/day pillars', () => {
  const g = getGanji(2024, 2, 10); // 갑진년 설날
  assert.equal(g.year.name, '갑진');
  assert.equal(g.year.hanja, '甲辰');
  assert.equal(g.month.name, '병인');
  assert.equal(g.day.name, '갑진');
  assert.deepEqual(g.lunar, { year: 2024, month: 1, day: 1, isLeapMonth: false });

  // The year pillar follows the lunar year: the day before Seollal is still 계묘년.
  assert.equal(getGanji(2024, 2, 9).year.name, '계묘');

  assert.equal(getGanji(2025, 1, 29).year.name, '을사'); // 을사년 설날
  assert.equal(getGanji(2025, 1, 29).month.name, '무인');
  assert.equal(getGanji(2025, 1, 29).day.name, '무술');
});

test('leap month shares its named month pillar', () => {
  const regular = getGanji(2020, 4, 23); // 평4월 1일
  const leap = getGanji(2020, 5, 23);    // 윤4월 1일
  assert.equal(regular.month.name, '신사');
  assert.equal(leap.month.name, '신사');
  assert.equal(regular.lunar.isLeapMonth, false);
  assert.equal(leap.lunar.isLeapMonth, true);
});

test('oracle sweep: 900 dates against korean-lunar-calendar gapja output', () => {
  const rows = JSON.parse(readFileSync(new URL('./fixtures/ganji-oracle.json', import.meta.url), 'utf8'));
  assert.ok(rows.length >= 900);
  const bad = [];
  for (const [y, m, d, koYear, koMonth, koDay, cnDay, leap] of rows) {
    const g = getGanji(y, m, d);
    if (
      g.year.name + '년' !== koYear ||
      g.month.name + '월' !== koMonth ||
      g.day.name + '일' !== koDay ||
      g.day.hanja + '日' !== cnDay ||
      (g.lunar.isLeapMonth ? 1 : 0) !== leap
    ) {
      bad.push(`${y}-${m}-${d}: expected ${koYear} ${koMonth} ${koDay}, got ${g.year.name}년 ${g.month.name}월 ${g.day.name}일`);
      if (bad.length > 10) break;
    }
  }
  assert.deepEqual(bad, []);
});

test('day pillar is continuous across the Gregorian reform', () => {
  // 1582-10-04 (Julian) is immediately followed by 1582-10-15 (Gregorian):
  // consecutive physical days, so consecutive day pillars.
  const a = getGanji(1582, 10, 4).day;
  const b = getGanji(1582, 10, 15).day;
  const idx = (p) => { for (let i = 0; i < 60; i++) if (i % 10 === p.stem && i % 12 === p.branch) return i; };
  assert.equal((idx(a) + 1) % 60, idx(b));
});
