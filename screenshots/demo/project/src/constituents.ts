export interface Constituent {
  readonly name: string;
  /** Angular speed in degrees per mean solar hour. */
  readonly speed: number;
  readonly description: string;
}

export const CONSTITUENTS: readonly Constituent[] = [
  { name: 'M2', speed: 28.9841042, description: 'Principal lunar semidiurnal' },
  { name: 'S2', speed: 30.0, description: 'Principal solar semidiurnal' },
  { name: 'N2', speed: 28.4397295, description: 'Larger lunar elliptic semidiurnal' },
  { name: 'K1', speed: 15.0410686, description: 'Lunisolar diurnal' },
  { name: 'O1', speed: 13.9430356, description: 'Lunar diurnal' },
];

export const periodHours = (c: Constituent): number => 360 / c.speed;
