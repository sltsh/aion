const PATHS = {
  github: 'M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.3 9.39 7.87 10.91.58.1.79-.25.79-.55v-2.14c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.16 1.18a11.04 11.04 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.13v3.15c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  external: 'M14 4h6v6m0-6L10 14M10 4H4v16h16v-6',
  copy: 'M9 9h11v11H9zM15 9V4H4v11h5',
  check: 'M5 12l4 4L19 6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
} as const;

export const icon = (name: keyof typeof PATHS): string =>
  `<svg class="icon" viewBox="0 0 24 24" fill="${name === 'github' ? 'currentColor' : 'none'}" stroke="${name === 'github' ? 'none' : 'currentColor'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[name]}" /></svg>`;
