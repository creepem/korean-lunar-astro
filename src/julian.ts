/**
 * Julian day conversions for the civil (Julian/Gregorian) calendar.
 * The Gregorian reform is applied at its historical date: 1582-10-04 (Julian)
 * is followed by 1582-10-15 (Gregorian); 1582-10-05..14 do not exist.
 */

/** Civil date + time of day -> Julian Day. */
export function julianDay(year: number, month: number, day: number, hour = 0, min = 0, sec = 0): number {
  const thr = hour + min / 60 + sec / 3600;
  let ggg = 1;
  if (year < 1582) ggg = 0;
  if (year <= 1582 && month < 10) ggg = 0;
  if (year <= 1582 && month === 10 && day < 5) ggg = 0;
  let tJD = -Math.trunc((7 * (Math.trunc((month + 9) / 12) + year)) / 4);
  const s = month - 9 < 0 ? -1 : 1;
  const a = Math.abs(month - 9);
  let j1 = Math.trunc(year + s * Math.trunc(a / 7));
  j1 = -Math.trunc(((Math.trunc(j1 / 100) + 1) * 3) / 4);
  tJD = tJD + Math.trunc((275 * month) / 9) + day + ggg * j1;
  tJD = tJD + 1721027 + 2 * ggg + 367 * year - 0.5;
  return tJD + thr / 24;
}

export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

/** Julian Day -> civil date (time of day discarded). */
export function invJD(jd: number): CivilDate {
  const z = Math.trunc(jd + 0.5);
  const f = jd + 0.5 - z;
  let a: number;
  if (z < 2299161) {
    a = z;
  } else {
    const i = Math.trunc((z - 1867216.25) / 36524.25);
    a = z + 1 + i - Math.trunc(i / 4);
  }
  const b = a + 1524;
  const c = Math.trunc((b - 122.1) / 365.25);
  const d = Math.trunc(365.25 * c);
  const t = Math.trunc((b - d) / 30.6001);
  const rj = b - d - Math.trunc(30.6001 * t) + f;
  const day = Math.trunc(rj);
  let month = 0;
  if (t < 14) month = t - 1;
  else if (t === 14 || t === 15) month = t - 13;
  let year = 0;
  if (month > 2) year = c - 4716;
  else if (month === 1 || month === 2) year = c - 4715;
  return { year, month, day };
}

/** Julian Day -> civil year only. */
export function invJDYear(jd: number): number {
  return invJD(jd).year;
}

/** Round a JD down to the preceding midnight boundary (*.5). */
export function getJD0(jd: number): number {
  if (jd - Math.trunc(jd) >= 0.5) return Math.trunc(jd) + 0.5;
  return Math.trunc(jd) - 0.5;
}

/**
 * Does this civil date actually exist?
 * Handles month lengths, Julian vs Gregorian leap rules, and the ten days
 * removed by the Gregorian reform (1582-10-05..14).
 */
export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  let max: number;
  switch (month) {
    case 4: case 6: case 9: case 11:
      max = 30;
      break;
    case 2: {
      const leap = year > 1582
        ? (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 // Gregorian
        : year % 4 === 0; // Julian
      max = leap ? 29 : 28;
      break;
    }
    default:
      max = 31;
  }
  if (day > max) return false;
  if (year === 1582 && month === 10 && day >= 5 && day <= 14) return false;
  return true;
}
