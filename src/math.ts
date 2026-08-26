/** Degree-based trig helpers and angle utilities. */

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/** Mean tropical year length in days. */
export const TROPICAL_YEAR = 365.24219;
/** Mean solar motion, degrees per day. */
export const SUN_DEG_PER_DAY = 360 / TROPICAL_YEAR;
/** Mean elongation rate of the Moon from the Sun, degrees per day. */
export const MOON_ELONG_DEG_PER_DAY = 12.190749387105;

/** Normalize an angle to [0, 360). */
export function rev(x: number): number {
  return x - Math.floor(x / 360.0) * 360;
}

export function sind(x: number): number {
  return Math.sin(x * DEG2RAD);
}

export function cosd(x: number): number {
  return Math.cos(x * DEG2RAD);
}

export function tand(x: number): number {
  return Math.tan(x * DEG2RAD);
}

export function arccosd(x: number): number {
  if (x <= -1) return 180;
  if (x < 1 && x > -1) return 90 - RAD2DEG * Math.atan(x / Math.sqrt(1 - x * x));
  return 0;
}

/** Angular distance between two ecliptic longitudes, in [0, 180]. */
export function angDistLon(a: number, b: number): number {
  if (a === b) return 0;
  return arccosd(cosd(a - b));
}
