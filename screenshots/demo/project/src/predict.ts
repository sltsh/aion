import { CONSTITUENTS } from './constituents.ts';
import { formatHeight, formatTime } from './format.ts';

/** Harmonic constants for one station, as published in its tide table. */
export interface Station {
  readonly id: string;
  readonly name: string;
  readonly timeZone: string;
  readonly datum: number; // metres above chart datum
  readonly harmonics: Record<string, { amplitude: number; phase: number }>;
}

const HOUR = 3_600_000;
const STATION_ID = /^[A-Z]{2}-\d{4}$/;

export class UnknownStationError extends Error {
  readonly id: string;

  constructor(id: string) {
    super(`No harmonics published for station ${id}`);
    this.id = id;
  }
}

/** Water level in metres at `time`, summed over every constituent. */
export function heightAt(station: Station, time: Date, epoch = Date.UTC(2026, 0, 1)): number {
  const hours = (time.getTime() - epoch) / HOUR;
  let level = station.datum;
  for (const { name, speed } of CONSTITUENTS) {
    const constant = station.harmonics[name];
    if (!constant) continue;
    level += constant.amplitude * Math.cos(toRadians(speed * hours - constant.phase));
  }
  return level;
}

export async function loadStation(id: string, base = 'https://tides.example/stations/'): Promise<Station> {
  if (!STATION_ID.test(id)) throw new UnknownStationError(id);
  const response = await fetch(new URL(`${id}.json`, base));
  if (!response.ok) throw new UnknownStationError(id);
  return (await response.json()) as Station;
}

/** The first local maximum after `from`, searched in six-minute steps for 13 hours. */
export function nextHighWater(station: Station, from: Date, stepMinutes = 6) {
  const step = stepMinutes * 60_000;
  for (let t = from.getTime() + step; t < from.getTime() + 13 * HOUR; t += step) {
    const [before, now, after] = [t - step, t, t + step].map((ms) => heightAt(station, new Date(ms)));
    if (now > before && now >= after) {
      const time = new Date(t);
      return { time, level: now, label: `${formatTime(time, station.timeZone)} ${formatHeight(now)}` };
    }
  }
  return undefined;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
