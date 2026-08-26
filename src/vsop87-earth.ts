/**
 * Earth heliocentric position from the truncated VSOP87 series,
 * with the VSOP87 -> FK5 frame correction applied.
 * Accuracy of the truncated series: about 1 arcsecond over -2000..+6000.
 */
import { EARTH_L, EARTH_B, EARTH_R } from './vsop87-earth-data.js';
import { rev, sind, cosd, tand, RAD2DEG } from './math.js';

function evalSeries(terms: readonly number[], tau: number): number {
  let q = 0;
  for (let i = 0; i < terms.length; i += 3) {
    q += terms[i] * Math.cos(terms[i + 1] + terms[i + 2] * tau);
  }
  return q;
}

function evalVSOP(series: readonly (readonly number[])[], tau: number): number {
  let sum = 0;
  for (let k = 0; k < series.length; k++) {
    let q = evalSeries(series[k], tau);
    for (let p = 0; p < k; p++) q *= tau;
    sum += q;
  }
  return sum;
}

export interface EarthPosition {
  /** Heliocentric ecliptic longitude, degrees, FK5, [0, 360). */
  lonDeg: number;
  /** Heliocentric ecliptic latitude, degrees. */
  latDeg: number;
  /** Sun-Earth distance, AU. */
  rAU: number;
}

/** Earth heliocentric L, B, R at a TDT Julian Day (equinox of date, FK5). */
export function earthPosition(jde: number): EarthPosition {
  const tau = (jde - 2451545.0) / 365250.0;

  let lon = rev(evalVSOP(EARTH_L, tau) * RAD2DEG);
  let lat = evalVSOP(EARTH_B, tau) * RAD2DEG;
  const rAU = evalVSOP(EARTH_R, tau);

  // VSOP87 dynamical ecliptic -> FK5 correction (Meeus 32.3).
  const t = (jde - 2451545) / 36525;
  const ll = lon - 1.397 * t - 0.00031 * t * t;
  const cll = cosd(ll);
  const sll = sind(ll);
  lon = lon - 2.50916666666667e-5 + 1.08777777777778e-5 * (cll + sll) * tand(lat);
  lat = lat + 1.08777777777778e-5 * (cll - sll);

  return { lonDeg: rev(lon), latDeg: lat, rAU };
}
