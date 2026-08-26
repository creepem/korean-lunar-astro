/**
 * Event solvers: the instant the apparent Sun reaches a given ecliptic
 * longitude (solar terms / jeolgi), and the instant of new moon.
 * Both iterate to a time tolerance of about 0.1 seconds.
 */
import { earthPosition } from './vsop87-earth.js';
import { moonPosition } from './moon.js';
import { jdToTDT } from './deltat.js';
import { julianDay } from './julian.js';
import { rev, sind, angDistLon, SUN_DEG_PER_DAY, MOON_ELONG_DEG_PER_DAY } from './math.js';

/** Annual aberration constant for the Sun, degrees (20.4898" / R in AU). */
const ABERRATION = 0.005691611;

/** Nutation in longitude, arcseconds (low-precision IAU 1980 subset). */
export function nutationLon(jde: number): number {
  const t = (jde - 2451545) / 36525;
  const t2 = t * t;
  const l1 = rev(280.466457 + 36000.7698278 * t + 0.00030322 * t2 + 0.00000002 * t2 * t); // mean Sun
  const l2 = rev(218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + (t2 * t) / 538841 - (t2 * t2) / 65194000); // mean Moon
  const om = rev(125.04452 - 1934.136261 * t + 0.0020708 * t2 + (t2 * t) / 450000); // lunar ascending node
  return -17.2 * sind(om) - 1.32 * sind(2 * l1) - 0.23 * sind(2 * l2) + 0.21 * sind(2 * om);
}

/**
 * Instant (JD, local standard time of the given meridian) at which the
 * apparent geocentric longitude of the Sun equals `lonSun` degrees, searched
 * near day-of-year `refDay` of civil year `year`.
 */
export function solarTermJD(year: number, lonSun: number, refDay: number, tzHours: number): number {
  if (year < 1582) refDay = refDay + Math.floor(0.0078 * (1582.0 - year));
  const jdYear = julianDay(year, 1, 0, 0, 0, 0);
  let tJD = jdYear + refDay;

  let e = earthPosition(jdToTDT(tJD));
  let lamSun = rev(e.lonDeg + 180.0 - ABERRATION / e.rAU);
  let dLam = angDistLon(lamSun, lonSun);

  let i = 0;
  do {
    const dt = dLam / SUN_DEG_PER_DAY;
    if (lonSun > 357 || lonSun < 3) {
      if (lamSun > 180) lamSun = lamSun - 360;
    }
    if (lonSun > lamSun) tJD = tJD + dt;
    else tJD = tJD - dt;

    const tdt = jdToTDT(tJD);
    e = earthPosition(tdt);
    const dPsi = nutationLon(tdt);
    lamSun = rev(e.lonDeg + 180 + dPsi / 3600 - ABERRATION / e.rAU);
    dLam = angDistLon(lamSun, lonSun);
    i = i + 1;
  } while (!((dLam / SUN_DEG_PER_DAY) * 86400 < 0.1 || i > 50));

  return tJD + tzHours / 24;
}

/**
 * Instant (JD, local standard time of the given meridian) of the new moon
 * nearest to / after `jdNear`.
 */
export function newMoonJD(jdNear: number, tzHours: number): number {
  const lonMoon = 0; // new moon: elongation 0
  let tJD = jdNear;
  let tTDT = jdToTDT(tJD);
  let firstPass = true;
  let mAge = 0;
  let dLam = 0;

  // Coarse step: jump close to the target elongation once, then re-evaluate.
  for (;;) {
    const sun = earthPosition(tTDT);
    const moon = moonPosition(tTDT);
    const lamSun = rev(sun.lonDeg + 180);
    const lamMoon = rev(moon.lonDeg);
    mAge = rev(lamMoon - lamSun);
    dLam = angDistLon(mAge, lonMoon);
    if (firstPass) {
      tJD = jdNear - mAge / MOON_ELONG_DEG_PER_DAY;
      tTDT = jdToTDT(tJD);
      firstPass = false;
    } else {
      break;
    }
  }

  // Refine.
  let i = 0;
  do {
    const dt = dLam / MOON_ELONG_DEG_PER_DAY;
    if (mAge > 180) mAge = mAge - 360;
    if (lonMoon > mAge) tJD = tJD + dt;
    else tJD = tJD - dt;

    tTDT = jdToTDT(tJD);
    const sun = earthPosition(tTDT);
    const moon = moonPosition(tTDT);
    const lamSun = rev(sun.lonDeg + 180 - ABERRATION / sun.rAU);
    const lamMoon = rev(moon.lonDeg);
    mAge = rev(lamMoon - lamSun);
    dLam = angDistLon(mAge, lonMoon);
    i = i + 1;
  } while (!((dLam / MOON_ELONG_DEG_PER_DAY) * 86400 < 0.1 || i > 50));

  return tJD + tzHours / 24;
}
