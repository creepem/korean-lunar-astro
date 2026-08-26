/**
 * Delta-T model: converts a UT-based Julian Day to Terrestrial (Dynamical) Time.
 * Piecewise fit assembled from published Delta-T tables and polynomial
 * approximations (cf. Meeus, Astronomical Algorithms ch. 10, and the
 * Astronomical Almanac historical tables).
 */
import { invJDYear } from './julian.js';

/** [firstYear, lastYear, deltaT in seconds] steps for 1620-1799 and 1997-2001. */
const DT_STEPS: readonly (readonly [number, number, number])[] = [
  [1620, 1621, 124], [1622, 1623, 115], [1624, 1625, 106], [1626, 1627, 98],
  [1628, 1629, 91], [1630, 1631, 85], [1632, 1633, 79], [1634, 1635, 74],
  [1636, 1637, 70], [1638, 1639, 65], [1640, 1645, 60], [1646, 1653, 50],
  [1654, 1661, 40], [1662, 1671, 30], [1672, 1681, 20], [1682, 1691, 10],
  [1692, 1707, 9], [1708, 1717, 10], [1718, 1733, 11], [1734, 1743, 12],
  [1744, 1751, 13], [1752, 1757, 14], [1758, 1765, 15], [1766, 1775, 16],
  [1776, 1791, 17], [1792, 1795, 16], [1796, 1797, 15], [1798, 1799, 14],
  [1997, 1997, 62], [1998, 1999, 63], [2000, 2001, 64],
];

/** UT Julian Day -> TDT Julian Day. */
export function jdToTDT(jd: number): number {
  const y = Math.trunc(invJDYear(jd));
  let t: number;
  let dt = 0; // hours

  if (y < 949) {
    t = (y - 2000) / 100.0;
    dt = (2715.6 + 573.36 * t + 46.5 * t * t) / 3600;
  } else if (y >= 949 && y <= 1619) {
    t = (y - 1850) / 100.0;
    dt = (22.5 * t * t) / 3600;
  } else if (y >= 1620 && y <= 1799) {
    for (const [a, b, sec] of DT_STEPS) {
      if (y >= a && y <= b) { dt = sec / 3600.0; break; }
    }
  } else if (y >= 1800 && y <= 1899) {
    t = (y - 1900.0) / 100.0;
    dt = 727058.63 + t * 123563.95;
    dt = 2513807.78 + t * (1818961.41 + t * dt);
    dt = 1061660.75 + t * (2087298.89 + t * dt);
    dt = 56282.84 + t * (324011.78 + t * dt);
    dt = -2.5 + t * (228.95 + t * (5218.61 + t * dt));
    dt = dt / 3600;
  } else if (y >= 1900 && y <= 1987) {
    t = (y - 1900.0) / 100.0;
    dt = -0.861938 + t * (0.677066 + t * -0.212591);
    dt = 0.025184 + t * (-0.181133 + t * (0.55304 + t * dt));
    dt = -0.00002 + t * (0.000297 + t * dt);
    dt = dt * 24.0;
  } else if (y >= 1988 && y <= 1996) {
    t = (y - 2000) / 100.0;
    dt = (67 + 123.5 * t + 32.5 * t * t) / 3600;
  } else if (y >= 1997 && y <= 2001) {
    for (const [a, b, sec] of DT_STEPS) {
      if (y >= a && y <= b) { dt = sec / 3600.0; break; }
    }
  } else if (y >= 2002 && y <= 2020) {
    t = (y - 2000) / 100.0;
    dt = (63 + 123.5 * t + 32.5 * t * t) / 3600;
  } else if (y > 2020) {
    t = (y - 1875.1) / 100;
    dt = (45.39 * t * t) / 3600;
  }

  return dt / 24 + jd;
}
