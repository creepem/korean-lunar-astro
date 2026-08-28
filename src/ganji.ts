/**
 * Sexagenary cycle (간지/干支) pillars for a date: the year pillar (세차),
 * month pillar (월건) and day pillar (일진).
 *
 * Conventions (matching common Korean almanac / 만세력 usage):
 * - The year pillar follows the LUNAR year, so it changes at Seollal
 *   (lunar new year), not at January 1st.
 * - The month pillar is derived from the lunar month via the five-tigers
 *   rule (오호둔): the stem of month 1 is determined by the year stem.
 *   A leap month shares the pillar of the month it follows; check
 *   `lunar.isLeapMonth` to render the customary "윤" marker.
 * - The day pillar is the continuous 60-day cycle over Julian Day Number.
 */
import { julianDay } from './julian.js';
import { jdToLunar } from './calendar.js';
import type { LunarDateFields } from './calendar.js';

const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export interface GanjiPillar {
  /** Heavenly stem index 0..9 (갑=0 .. 계=9). */
  stem: number;
  /** Earthly branch index 0..11 (자=0 .. 해=11). */
  branch: number;
  /** Korean reading, e.g. "갑진". */
  name: string;
  /** Hanja, e.g. "甲辰". */
  hanja: string;
}

export interface Ganji {
  /** 세차 — pillar of the lunar year. */
  year: GanjiPillar;
  /** 월건 — pillar of the lunar month (a leap month shares its named month's pillar). */
  month: GanjiPillar;
  /** 일진 — pillar of the civil day. */
  day: GanjiPillar;
  /** The lunar date the pillars were derived from. */
  lunar: LunarDateFields;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function pillarOf(stem: number, branch: number): GanjiPillar {
  return {
    stem,
    branch,
    name: STEMS_KO[stem] + BRANCHES_KO[branch],
    hanja: STEMS_HANJA[stem] + BRANCHES_HANJA[branch],
  };
}

/** Year pillar (세차) for a lunar year. AD 4 was 갑자년. */
export function yearPillar(lunarYear: number): GanjiPillar {
  return pillarOf(mod(lunarYear - 4, 10), mod(lunarYear - 4, 12));
}

/**
 * Month pillar (월건) for a lunar month. Month 1 is always an 인(寅) month;
 * its stem follows the five-tigers rule from the year stem.
 */
export function monthPillar(lunarYear: number, lunarMonth: number): GanjiPillar {
  const yearStem = mod(lunarYear - 4, 10);
  const month1Stem = ((yearStem % 5) * 2 + 2) % 10;
  return pillarOf(mod(month1Stem + lunarMonth - 1, 10), mod(lunarMonth + 1, 12));
}

/** Day pillar (일진) for a civil (solar-calendar) date. */
export function dayPillar(solarYear: number, solarMonth: number, solarDay: number): GanjiPillar {
  const jdn = Math.trunc(julianDay(solarYear, solarMonth, solarDay, 12, 0));
  const i = mod(jdn + 49, 60);
  return pillarOf(i % 10, i % 12);
}

/** All three pillars for a solar date, given its already-computed lunar date. */
export function ganjiOf(solarYear: number, solarMonth: number, solarDay: number, lunar: LunarDateFields): Ganji {
  return {
    year: yearPillar(lunar.year),
    month: monthPillar(lunar.year, lunar.month),
    day: dayPillar(solarYear, solarMonth, solarDay),
    lunar,
  };
}

/** Internal helper for the public API: converts and assembles in one step. */
export function ganjiForSolar(solarYear: number, solarMonth: number, solarDay: number, tz: number): Ganji {
  const lunar = jdToLunar(julianDay(solarYear, solarMonth, solarDay, 12, 0), tz);
  return ganjiOf(solarYear, solarMonth, solarDay, lunar);
}
