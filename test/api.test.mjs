import test from 'node:test';
import assert from 'node:assert/strict';
import { solarToLunar, lunarToSolar, getLunarMonthLength, isValidLunarDate } from '../dist/esm/index.js';

function lunar(year, month, day, isLeapMonth = false) {
  return { year, month, day, isLeapMonth };
}

test('known Korean holidays (KASI published dates)', () => {
  // 설날 (lunar 1-1)
  assert.deepEqual(solarToLunar(2026, 2, 17), lunar(2026, 1, 1));
  assert.deepEqual(solarToLunar(2025, 1, 29), lunar(2025, 1, 1));
  assert.deepEqual(solarToLunar(2024, 2, 10), lunar(2024, 1, 1));
  assert.deepEqual(solarToLunar(2023, 1, 22), lunar(2023, 1, 1));
  // 추석 (lunar 8-15)
  assert.deepEqual(solarToLunar(2025, 10, 6), lunar(2025, 8, 15));
  assert.deepEqual(solarToLunar(2024, 9, 17), lunar(2024, 8, 15));
  assert.deepEqual(solarToLunar(2017, 10, 4), lunar(2017, 8, 15));
  assert.deepEqual(solarToLunar(1988, 9, 25), lunar(1988, 8, 15));
  // 부처님오신날 (lunar 4-8)
  assert.deepEqual(solarToLunar(2024, 5, 15), lunar(2024, 4, 8));
  assert.deepEqual(solarToLunar(2025, 5, 5), lunar(2025, 4, 8));
});

test('leap months', () => {
  assert.deepEqual(solarToLunar(2023, 3, 22), lunar(2023, 2, 1, true)); // 윤2월
  assert.deepEqual(solarToLunar(2020, 5, 23), lunar(2020, 4, 1, true)); // 윤4월
  assert.deepEqual(solarToLunar(2017, 6, 24), lunar(2017, 5, 1, true)); // 윤5월
  assert.deepEqual(solarToLunar(2014, 10, 24), lunar(2014, 9, 1, true)); // 윤9월

  assert.deepEqual(lunarToSolar(2020, 4, 1, false), { year: 2020, month: 4, day: 23 });
  assert.deepEqual(lunarToSolar(2020, 4, 1, true), { year: 2020, month: 5, day: 23 });
});

test('the 2033 leap-month edge case resolves to leap 11th month', () => {
  // Many table-based implementations place the 2033 leap month incorrectly.
  // KASI: the month starting 2033-12-22 is leap month 11.
  assert.deepEqual(solarToLunar(2033, 12, 22), lunar(2033, 11, 1, true));
  assert.deepEqual(solarToLunar(2033, 11, 22), lunar(2033, 11, 1, false));
  assert.deepEqual(solarToLunar(2034, 2, 19), lunar(2034, 1, 1, false));
});

test('lunarToSolar rejects dates that do not exist', () => {
  assert.throws(() => lunarToSolar(2024, 13, 1), RangeError);
  assert.throws(() => lunarToSolar(2024, 1, 0), RangeError);
  assert.throws(() => lunarToSolar(2024, 1, 31), RangeError);
  // 2024 has no leap month 1.
  assert.throws(() => lunarToSolar(2024, 1, 1, true), RangeError);
  // Lunar 2024-01 has 29 days; day 30 must be rejected, not silently
  // rolled over to the next month.
  assert.equal(getLunarMonthLength(2024, 1), 29);
  assert.throws(() => lunarToSolar(2024, 1, 30), RangeError);
});

test('solarToLunar rejects dates that do not exist', () => {
  assert.throws(() => solarToLunar(2024, 2, 30), RangeError);
  assert.throws(() => solarToLunar(2024, 13, 1), RangeError);
  assert.throws(() => solarToLunar(2024, 0, 1), RangeError);
  assert.throws(() => solarToLunar(1582, 10, 10), RangeError); // removed by the Gregorian reform
  assert.throws(() => solarToLunar(999, 1, 1), RangeError); // below supported range
  assert.throws(() => solarToLunar(2501, 1, 1), RangeError); // above supported range
});

test('isValidLunarDate', () => {
  assert.equal(isValidLunarDate(2024, 1, 29), true);
  assert.equal(isValidLunarDate(2024, 1, 30), false);
  assert.equal(isValidLunarDate(2020, 4, 1, true), true);
  assert.equal(isValidLunarDate(2024, 1, 1, true), false);
  assert.equal(isValidLunarDate(2024, 13, 1), false);
});

test('Gregorian reform boundary is continuous', () => {
  const a = solarToLunar(1582, 10, 4);
  const b = solarToLunar(1582, 10, 15);
  assert.deepEqual(a, lunar(1582, 9, 18));
  assert.deepEqual(b, lunar(1582, 9, 19));
});

test('meridian option: UTC+8 reproduces the Chinese-calendar day shift', () => {
  // Korean Seollal 1997 was Feb 8 (KST); with a UTC+8 meridian the new moon
  // falls a civil day earlier, as in the Chinese calendar.
  assert.deepEqual(lunarToSolar(1997, 1, 1), { year: 1997, month: 2, day: 8 });
  assert.deepEqual(lunarToSolar(1997, 1, 1, false, { meridianHours: 8 }), { year: 1997, month: 2, day: 7 });
});

test('round trip 1980..2030', () => {
  const startJD = Date.UTC(1980, 0, 1);
  const endJD = Date.UTC(2030, 11, 31);
  const DAY = 86400000;
  let n = 0;
  for (let t = startJD; t <= endJD; t += DAY) {
    const dt = new Date(t);
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth() + 1;
    const d = dt.getUTCDate();
    const l = solarToLunar(y, m, d);
    const s = lunarToSolar(l.year, l.month, l.day, l.isLeapMonth);
    assert.deepEqual(s, { year: y, month: m, day: d }, `round trip failed for ${y}-${m}-${d} via ${JSON.stringify(l)}`);
    n++;
  }
  assert.ok(n > 18000);
});
