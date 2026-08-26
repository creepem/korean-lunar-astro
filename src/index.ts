/**
 * korean-lunar-astro
 *
 * Korean lunisolar calendar conversion computed from first principles:
 * true solar terms and true new moons via VSOP87 (Earth) and Meeus ch. 47
 * (Moon), with the traditional no-junggi leap-month rule (무중치윤법).
 * No lookup tables, no supported-range cliff.
 */
import { julianDay, invJD, isValidSolarDate } from './julian.js';
import { jdToLunar, findLunarMonth } from './calendar.js';

export interface KoreanLunarDate {
  /** Lunar year. */
  year: number;
  /** Lunar month, 1..12. */
  month: number;
  /** Lunar day, 1..30. */
  day: number;
  /** True if the date falls in a leap month (윤달). */
  isLeapMonth: boolean;
}

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface ConvertOptions {
  /**
   * Reference meridian in hours east of Greenwich used to decide which civil
   * day a new moon / solar term falls on.
   *
   * Default: the Korean historical rule - UTC+9 (KST) from 1911 onward,
   * UTC+8 before that. Setting 8 approximates the Chinese lunisolar calendar
   * and 7 the Vietnamese one (their official calendars may still differ -
   * see the README).
   */
  meridianHours?: number;
}

/** Supported year range (see README for the validation evidence). */
const MIN_YEAR = 1000;
const MAX_YEAR = 2500;

function meridianFor(year: number, options?: ConvertOptions): number {
  if (options?.meridianHours !== undefined) return options.meridianHours;
  return year < 1911 ? 8 : 9;
}

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`year must be an integer in [${MIN_YEAR}, ${MAX_YEAR}], got ${year}`);
  }
}

/**
 * Convert a solar (Gregorian; Julian before 1582-10-15) date to the Korean
 * lunar date.
 *
 * @throws RangeError if the solar date does not exist or is out of range.
 */
export function solarToLunar(year: number, month: number, day: number, options?: ConvertOptions): KoreanLunarDate {
  assertYear(year);
  if (!isValidSolarDate(year, month, day)) {
    throw new RangeError(`invalid solar date: ${year}-${month}-${day}`);
  }
  const tz = meridianFor(year, options);
  const jd = julianDay(year, month, day, 12, 0);
  return jdToLunar(jd, tz);
}

/**
 * Convert a Korean lunar date to the solar (Gregorian; Julian before
 * 1582-10-15) date.
 *
 * @throws RangeError if the lunar date does not exist: unknown month, a leap
 * month that does not occur in that year, or day 30 of a 29-day month.
 */
export function lunarToSolar(year: number, month: number, day: number, isLeapMonth = false, options?: ConvertOptions): SolarDate {
  assertYear(year);
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1 || day > 30) {
    throw new RangeError(`invalid lunar date: ${year}-${month}-${day}`);
  }
  const tz = meridianFor(year, options);
  const entry = findLunarMonth(year, month, isLeapMonth, tz);
  if (entry === null) {
    throw new RangeError(`lunar month does not exist: ${year}-${month}${isLeapMonth ? ' (leap)' : ''}`);
  }
  if (entry.length > 0 && day > entry.length) {
    throw new RangeError(`lunar ${year}-${month}${isLeapMonth ? ' (leap)' : ''} has only ${entry.length} days, got ${day}`);
  }
  const { year: y, month: m, day: d } = invJD(entry.start + day - 1);
  return { year: y, month: m, day: d };
}

/**
 * Number of days (29 or 30) in the given lunar month.
 *
 * @throws RangeError if the lunar month does not exist.
 */
export function getLunarMonthLength(year: number, month: number, isLeapMonth = false, options?: ConvertOptions): number {
  assertYear(year);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`invalid lunar month: ${year}-${month}`);
  }
  const tz = meridianFor(year, options);
  const entry = findLunarMonth(year, month, isLeapMonth, tz);
  if (entry === null) {
    throw new RangeError(`lunar month does not exist: ${year}-${month}${isLeapMonth ? ' (leap)' : ''}`);
  }
  return entry.length;
}

/** True if the given lunar date exists (month, leap-month flag and day). */
export function isValidLunarDate(year: number, month: number, day: number, isLeapMonth = false, options?: ConvertOptions): boolean {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > 30) return false;
  const tz = meridianFor(year, options);
  const entry = findLunarMonth(year, month, isLeapMonth, tz);
  if (entry === null) return false;
  return entry.length === 0 || day <= entry.length;
}
