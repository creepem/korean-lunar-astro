# korean-lunar-astro

**English** | [한국어](https://github.com/creepem/korean-lunar-astro/blob/main/README.ko.md)

[![CI](https://github.com/creepem/korean-lunar-astro/actions/workflows/ci.yml/badge.svg)](https://github.com/creepem/korean-lunar-astro/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/korean-lunar-astro)](https://www.npmjs.com/package/korean-lunar-astro)
[![npm downloads](https://img.shields.io/npm/dw/korean-lunar-astro)](https://www.npmjs.com/package/korean-lunar-astro)
[![bundle size](https://img.shields.io/bundlephobia/minzip/korean-lunar-astro)](https://bundlephobia.com/package/korean-lunar-astro)
[![license](https://img.shields.io/npm/l/korean-lunar-astro)](./LICENSE)

Korean lunar calendar (음력) ↔ solar calendar conversion, computed
**astronomically instead of from lookup tables**. True solar terms and true
new moons are calculated from the Sun's apparent longitude (VSOP87) and the
Moon's position (Meeus ch. 47), and leap months (윤달) are placed by the
traditional no-junggi rule (무중치윤법).

Zero dependencies, ~20 kB, TypeScript, ESM + CommonJS.

```bash
npm install korean-lunar-astro
```

```ts
import { solarToLunar, lunarToSolar, getLunarMonthLength, isValidLunarDate } from 'korean-lunar-astro';

solarToLunar(2025, 10, 6);
// { year: 2025, month: 8, day: 15, isLeapMonth: false }  ← Chuseok

lunarToSolar(2026, 1, 1);
// { year: 2026, month: 2, day: 17 }  ← Seollal (Korean New Year)

lunarToSolar(2020, 4, 1, true); // leap 4th month
// { year: 2020, month: 5, day: 23 }

getLunarMonthLength(2024, 1);   // 29 (short month)
isValidLunarDate(2024, 1, 30);  // false
```

CommonJS works too: `const { solarToLunar } = require('korean-lunar-astro');`

## Why this library

| | Table-based packages | korean-lunar-astro |
|---|---|---|
| Supported range | Ends where the table ends (e.g. 1000–2050) | **1000–2500** — computed, no cliff |
| The 2033 leap-month problem | Wrong if the table is wrong | **Correctly resolves to leap month 11** (see below) |
| 24 solar terms | Not available | Computed internally (solstice-anchored intercalation) |
| Other lunisolar calendars | No | Approximated via the `meridianHours` option |
| Bundle size | Tens of kB of tables | ~20 kB, zero dependencies |

### The 2033 problem

2033–2034 is a famous edge case where the alignment of solstices and new
moons makes the leap-month placement genuinely ambiguous unless computed
properly (the official answer from KASI, the Korea Astronomy and Space
Science Institute: **leap month 11**). Implementations based on cyclic
approximations or stale tables often place it incorrectly (e.g. leap month 7).

```ts
solarToLunar(2033, 12, 22);
// { year: 2033, month: 11, day: 1, isLeapMonth: true }  ← leap 11th month ✓
```

## Accuracy & validation

- **Full golden sweep of 73,414 days (1900–2100)** — every single day
  verified in CI on every commit
- **Bidirectional round-trip check over every day of 1980–2030**
- Cross-checked against KASI-published holiday dates (Seollal, Chuseok,
  Buddha's Birthday)
- Leap-month cases: 2023 (leap 2), 2020 (leap 4), 2017 (leap 5), 2014
  (leap 9), and the 2033 leap-11 edge case
- Continuity across the Gregorian reform boundary (1582-10-04 → 1582-10-15)

Computational precision: about 1″ in solar longitude, 10″ in lunar
longitude. In theory a date could shift by one day if a new moon falls
within a few seconds of midnight; this does not occur anywhere in the
validated 1900–2100 range.

> **Disclaimer**: the official Korean lunar calendar is determined by KASI.
> For legal or official purposes, defer to KASI publications. Dates far in
> the future are subject to ΔT (Earth rotation slowdown) prediction
> uncertainty.

## Performance

| Scenario | Time |
|---|---|
| First lookup in a year (cold) | ~8 ms |
| Repeat lookup in the same year (cached) | **~4 µs** |
| Cold sweep across 201 years | ~285 ms |

The month layout of each lunisolar year is cached in memory: the
astronomical computation (~8 ms) runs only on the first lookup of a year;
subsequent lookups in the same year are a table lookup (~4 µs). Calendar-UI
style workloads that query one year repeatedly pay almost no additional
computation cost.

## API

### `solarToLunar(year, month, day, options?) → KoreanLunarDate`

Solar → lunar. Dates before 1582-10-15 are interpreted in the Julian
calendar. Nonexistent dates (Feb 30, the ten days removed by the Gregorian
reform, …) throw a `RangeError`.

### `lunarToSolar(year, month, day, isLeapMonth?, options?) → SolarDate`

Lunar → solar. Nonexistent lunar dates — a leap month that does not occur
that year, or day 30 of a 29-day month — throw a `RangeError` instead of
silently rolling into the next month.

### `getLunarMonthLength(year, month, isLeapMonth?, options?) → 29 | 30`

### `isValidLunarDate(year, month, day, isLeapMonth?, options?) → boolean`

### `options.meridianHours`

The reference meridian (hours east of Greenwich) used to decide which civil
day a new moon or solar term falls on. Defaults to the Korean historical
rule: UTC+9 from 1911 onward, UTC+8 before that.

```ts
// Korean New Year 1997 was Feb 8 (KST); Chinese New Year was Feb 7 —
// one of the years where the 1-hour meridian difference shifts the day.
lunarToSolar(1997, 1, 1);                              // { year: 1997, month: 2, day: 8 }
lunarToSolar(1997, 1, 1, false, { meridianHours: 8 }); // { year: 1997, month: 2, day: 7 }
```

`8` approximates the Chinese lunisolar calendar and `7` the Vietnamese one
(their official calendars may still differ due to ΔT models and official
announcement rules). Between 1950 and 2050, the UTC+9 and UTC+8 results
differ on about 3.7% of all days.

## How it works

1. Anchor the lunisolar year on the winter solstice (천정동지)
2. Compute the true instants of the 12 major solar terms (every 30° of
   apparent solar longitude) from the VSOP87 Earth position
3. Compute the true new-moon instants from the Meeus ch. 47 lunar position
4. A lunar month runs from one new-moon day to the day before the next;
   each month is named by the major term it contains, and the month
   containing the winter solstice is always month 11
5. When 13 lunations fall between successive winter solstices, the first
   month without a major term becomes the leap month — the traditional
   no-junggi intercalation rule (무중치윤법)

ΔT (Terrestrial Time − Universal Time) uses piecewise polynomial/table
approximations.

## Data sources

- P. Bretagnon & G. Francou, *Planetary theories in rectangular and
  spherical variables — VSOP87 solutions*, Astronomy & Astrophysics 202
  (1988)
- J. Meeus, *Astronomical Algorithms*, 2nd ed. (1998) — ch. 25, 32, 47;
  Table 47.A/47.B
- Intercalation rule: the traditional no-junggi rule of the Shixian
  calendar (시헌력)

## License

MIT
