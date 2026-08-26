/**
 * Korean lunisolar calendar construction.
 *
 * Method (the traditional 무중치윤 / "no-junggi leap month" rule, computed
 * astronomically):
 *  1. Find the winter solstice anchoring the lunisolar year (천정동지).
 *  2. Compute the true instants of the 12 jungqi (major solar terms) and the
 *     true new moons (정삭) around that year, in local standard time of the
 *     reference meridian, and truncate each to its civil date.
 *  3. A lunar month runs from one new-moon day to the day before the next.
 *     Name each month by the jungqi it contains; the month containing the
 *     winter solstice is always month 11 (동짓달).
 *  4. If 13 lunations fall between successive winter solstices, the first
 *     month without a jungqi becomes the leap month (윤달).
 */
import { julianDay, invJDYear, getJD0 } from './julian.js';
import { solarTermJD, newMoonJD } from './astro.js';

/** One lunar month in a computed year table. */
export interface LunarMonth {
  /** JD of the first civil day of the month (integer-valued; noon-based). */
  start: number;
  /** Month name 1..12 (100 = not yet named / outside the labeled range). */
  monName: number;
  /** Lunar year this month belongs to (0 = outside the labeled range). */
  lYear: number;
  /** True if the month contains a jungqi (i.e. it is a regular month). */
  junggi: boolean;
  /** Month length in days (29 or 30; 0 if unknown at the table edge). */
  length: number;
}

export interface LunarDateFields {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

/**
 * The 12 jungqi (major solar terms), tracked from the solstice before the
 * year start through the second one after it:
 * [month number it names, solar longitude (deg), approximate day-of-year].
 */
const JUNGGI_TABLE: readonly (readonly [number, number, number])[] = [
  [10, 240, -43], // 소설
  [11, 270, -13], // 동지 (previous winter solstice)
  [12, 300, 20],  // 대한
  [1, 330, 50],   // 우수
  [2, 0, 80],     // 춘분
  [3, 30, 110],   // 곡우
  [4, 60, 140],   // 소만
  [5, 90, 170],   // 하지
  [6, 120, 200],  // 대서
  [7, 150, 230],  // 처서
  [8, 180, 260],  // 추분
  [9, 210, 290],  // 상강
  [10, 240, 320], // 소설
  [11, 270, 350], // 동지 (this winter solstice)
  [12, 300, 385], // 대한
  [1, 330, 415],  // 우수
];

// ---- caches ------------------------------------------------------------

const CACHE_CAP = 256;

function cachePut<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (map.size >= CACHE_CAP) {
    const oldest = map.keys().next();
    if (!oldest.done) map.delete(oldest.value);
  }
  map.set(key, value);
}

const termCache = new Map<string, number>();

/** Memoized solar-term instant (raw JD in local standard time). */
function solarTerm(year: number, lonSun: number, refDay: number, tz: number): number {
  const key = `${year}|${lonSun}|${refDay}|${tz}`;
  const hit = termCache.get(key);
  if (hit !== undefined) return hit;
  const v = solarTermJD(year, lonSun, refDay, tz);
  cachePut(termCache, key, v);
  return v;
}

interface YearTable {
  months: LunarMonth[];
  /** Last usable month index: months[0..k] have real start days. */
  k: number;
}

const tableCache = new Map<string, YearTable>();

// ---- year table construction -------------------------------------------

/**
 * Build the table of lunar months for the lunisolar year anchored at the
 * winter solstice preceding civil year `dYear`, using meridian `tz` (hours).
 */
function yearTable(dYear: number, tz: number): YearTable {
  const key = `${dYear}|${tz}`;
  const hit = tableCache.get(key);
  if (hit !== undefined) return hit;

  const yJD0 = julianDay(dYear, 1, 1, 12, 0);
  const nYear = invJDYear(yJD0);

  // Civil dates (as JD day boundaries) of the 16 tracked jungqi.
  const realDay: number[] = [];
  for (let i = 0; i <= 15; i++) {
    const [, lon, ref] = JUNGGI_TABLE[i];
    realDay[i] = getJD0(solarTerm(nYear, lon, ref, tz)) + 0.5;
  }

  // Civil dates of the true new moons covering the year (and then some).
  const SD: number[] = new Array(26).fill(0);
  let j = 0;
  let k = 0;
  let bf = 0;
  do {
    bf = newMoonJD(yJD0 - 96 + j * 28, tz);
    bf = getJD0(bf) + 0.5;
    if (bf >= realDay[0]) {
      if (k > 0) {
        if (bf > SD[k - 1]) { SD[k] = bf; k = k + 1; }
      } else {
        SD[0] = bf;
        k = 1;
      }
    }
    j = j + 1;
  } while (!(bf > yJD0 + 427));
  k = k - 1;

  const LD: LunarMonth[] = [];
  for (let i = 0; i <= 25; i++) {
    LD.push({ start: SD[i], monName: 100, lYear: 0, junggi: false, length: 0 });
  }

  // Tag months containing a jungqi and give them tentative names.
  for (let i = 0; i <= 24; i++) {
    LD[i].junggi = false;
    for (let jj = 0; jj <= 15; jj++) {
      if (LD[i + 1].start > realDay[jj] && realDay[jj] >= LD[i].start) {
        LD[i].junggi = true;
        if (LD[i].monName === 100) {
          LD[i].monName = JUNGGI_TABLE[jj][0];
        } else if (JUNGGI_TABLE[jj][0] === 11 || LD[i].monName === 11) {
          LD[i].monName = 11; // the solstice month is always month 11
        }
      }
    }
  }

  const preWinter = realDay[1];
  const thisWinter = realDay[13];

  // Count lunations between the two winter solstices and locate them.
  let count1 = 0;
  let idx1 = 0;
  let idx2 = 0;
  for (let i = 0; i <= k - 1; i++) {
    if (preWinter < LD[i].start && LD[i].start <= thisWinter) count1 = count1 + 1;
    if (preWinter < LD[i + 1].start && LD[i].start <= preWinter) idx1 = i;
    if (thisWinter < LD[i + 1].start && LD[i].start <= thisWinter) idx2 = i;
  }

  // Decide where the leap month can be.
  // count1 === 12: no leap month between the solstices - all regular months.
  // count1 === 13: exactly one month without a jungqi becomes the leap month;
  //   the two months right after the solstice month need special handling
  //   (leap 11th / leap 12th months attach before New Year).
  let leapType = 0;
  if (count1 === 12) {
    leapType = 4;
  } else {
    if (LD[idx1 + 1].junggi && LD[idx1 + 2].junggi) leapType = 1;
    if (!LD[idx1 + 1].junggi && LD[idx1 + 2].junggi) leapType = 2; // leap 11th month
    if (LD[idx1 + 1].junggi && !LD[idx1 + 2].junggi) leapType = 3; // leap 12th month
  }

  const dY = Math.trunc(dYear);
  switch (leapType) {
    case 1:
    case 4:
      LD[idx1 + 1].monName = 12; LD[idx1 + 1].lYear = dY - 1; LD[idx1 + 1].junggi = true;
      LD[idx1 + 2].monName = 1; LD[idx1 + 2].lYear = dY; LD[idx1 + 2].junggi = true;
      break;
    case 2:
      LD[idx1 + 1].monName = 11; LD[idx1 + 1].lYear = dY - 1; LD[idx1 + 1].junggi = false;
      LD[idx1 + 2].monName = 12; LD[idx1 + 2].lYear = dY - 1;
      break;
    case 3:
      LD[idx1 + 1].monName = 12; LD[idx1 + 1].lYear = dY - 1;
      LD[idx1 + 2].monName = 12; LD[idx1 + 2].lYear = dY - 1; LD[idx1 + 2].junggi = false;
      break;
  }

  LD[idx1].monName = 11;
  LD[idx1].lYear = dY - 1;

  // Number the remaining months of the year; in a 13-lunation year the first
  // jungqi-less month after New Year keeps the previous month's number and
  // becomes the leap month.
  const fMON = 1;
  let a = 0;
  let lCount = 0;
  if (leapType === 4) a = 1;
  for (let i = idx1 + 3; i <= idx2; i++) {
    LD[i].lYear = dY;
    if (leapType === 1) {
      if (LD[i].junggi || lCount > 0) {
        LD[i].junggi = true;
        a = a + 1;
      } else {
        lCount = 1;
      }
      LD[i].monName = fMON + a;
    } else {
      LD[i].monName = fMON + a;
      LD[i].junggi = true;
      a = a + 1;
    }
  }

  // Month lengths.
  for (let i = 0; i <= 24; i++) {
    if (Math.abs(LD[i + 1].start - LD[i].start) < 31) {
      LD[i].length = Math.trunc(LD[i + 1].start - LD[i].start);
    }
  }

  const table: YearTable = { months: LD, k };
  cachePut(tableCache, key, table);
  return table;
}

// ---- conversions --------------------------------------------------------

/** Solar (as noon JD) -> lunar date, meridian `tz` hours. */
export function jdToLunar(jd: number, tz: number): LunarDateFields {
  const jd0 = getJD0(jd) + 0.5;

  // Anchor on the lunisolar year whose solstice window contains jd0.
  let dYear = invJDYear(jd0);
  if (jd0 < solarTerm(dYear, 270, -13, tz)) dYear = dYear - 1;
  if (jd0 > solarTerm(dYear, 270, 355, tz)) dYear = dYear + 1;

  const { months, k } = yearTable(dYear, tz);
  for (let i = 0; i <= k - 1; i++) {
    if (jd0 >= months[i].start && jd0 < months[i + 1].start) {
      return {
        year: months[i].lYear,
        month: months[i].monName,
        day: Math.trunc(jd0 - months[i].start + 1),
        isLeapMonth: !months[i].junggi,
      };
    }
  }
  /* c8 ignore next */
  throw new Error(`internal error: JD ${jd} not covered by year table ${dYear}`);
}

/**
 * Locate the table entry for lunar (year, month, leap) at meridian `tz`.
 * Months of lunar year Y are labeled partly in table(Y) (months 1..11) and
 * partly in table(Y+1) (months 11, 12 and their leap variants).
 */
export function findLunarMonth(year: number, month: number, isLeapMonth: boolean, tz: number): LunarMonth | null {
  for (const dY of [year, year + 1]) {
    const { months, k } = yearTable(dY, tz);
    for (let i = 0; i <= k - 1; i++) {
      const m = months[i];
      if (m.start > 0 && m.lYear === year && m.monName === month && !m.junggi === isLeapMonth) {
        return m;
      }
    }
  }
  return null;
}
