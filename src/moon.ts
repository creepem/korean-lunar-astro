/**
 * Geocentric position of the Moon from the periodic terms of
 * Meeus, Astronomical Algorithms 2nd ed., chapter 47.
 * Accuracy: about 10 arcseconds in longitude, 4 in latitude.
 */
import { MOON_LR, MOON_B } from './moon-data.js';
import { rev, sind, DEG2RAD } from './math.js';

export interface MoonPosition {
  /** Geocentric ecliptic longitude, degrees, [0, 360). */
  lonDeg: number;
  /** Geocentric ecliptic latitude, degrees. */
  latDeg: number;
  /** Earth-Moon distance, km. */
  rKm: number;
}

/** Moon geocentric position at a TDT Julian Day (equinox of date). */
export function moonPosition(jde: number): MoonPosition {
  const t = (jde - 2451545) / 36525;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t2 * t2;

  // Fundamental arguments (Meeus 47.1-47.7), degrees.
  let l1 = 218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841 - t4 / 65194000;
  let d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000;
  let m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000;
  let m1 = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699 - t4 / 14712000;
  let f = 93.272095 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000 + t4 / 863310000;
  let a1 = 119.75 + 131.849 * t;
  let a2 = 53.09 + 479264.29 * t;
  let a3 = 313.45 + 481266.484 * t;
  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  const e2 = e * e;

  l1 = rev(l1); d = rev(d); m = rev(m); m1 = rev(m1); f = rev(f);
  a1 = rev(a1); a2 = rev(a2); a3 = rev(a3);

  let sl = 0;
  let sr = 0;
  let sb = 0;
  for (let i = 0; i < 60; i++) {
    const lr = MOON_LR[i];
    let k = 1;
    if (Math.abs(lr[1]) === 1) k = e;
    else if (Math.abs(lr[1]) === 2) k = e2;
    const arg = (lr[0] * d + lr[1] * m + lr[2] * m1 + lr[3] * f) * DEG2RAD;
    sl = sl + lr[4] * Math.sin(arg) * k;
    sr = sr + lr[5] * Math.cos(arg) * k;

    const lb = MOON_B[i];
    let kb = 1;
    if (Math.abs(lb[1]) === 1) kb = e;
    else if (Math.abs(lb[1]) === 2) kb = e2;
    const argB = rev(lb[0] * d + lb[1] * m + lb[2] * m1 + lb[3] * f) * DEG2RAD;
    sb = sb + lb[4] * Math.sin(argB) * kb;
  }

  // Additive terms for Venus (A1), Jupiter (A2) and flattening (Meeus p. 342).
  sl = sl + 3958 * sind(a1) + 1962 * sind(l1 - f) + 318 * sind(a2);
  sb = sb - 2235 * sind(l1) + 382 * sind(a3) + 175 * sind(a1 - f) + 175 * sind(a1 + f) + 127 * sind(l1 - m1) - 115 * sind(l1 + m1);

  return {
    lonDeg: rev(l1 + sl / 1000000),
    latDeg: sb / 1000000,
    rKm: 385000.56 + sr / 1000,
  };
}
