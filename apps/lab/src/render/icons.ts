const svg = (body: string): string =>
  `<svg class="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  files: svg('<path d="M3 2h5l3 3v9H3z"/><path d="M8 2v3h3"/>'),
  search: svg('<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>'),
  branch: svg('<circle cx="4.5" cy="3.5" r="1.6"/><circle cx="4.5" cy="12.5" r="1.6"/><circle cx="11.5" cy="6.5" r="1.6"/><path d="M4.5 5.1v5.8M11.5 8.1c0 2-2 2.6-4.2 2.9"/>'),
  debug: svg('<rect x="5" y="5" width="6" height="8" rx="3"/><path d="M3 7h2M11 7h2M3 11h2M11 11h2M6 4l1-1M10 4L9 3"/>'),
  blocks: svg('<rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><path d="M9 11.5h5M11.5 9v5"/>'),
  gear: svg('<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4"/>'),
  chevron: svg('<path d="M6 3.5L10.5 8 6 12.5"/>'),
  caretDown: svg('<path d="M3.5 6L8 10.5 12.5 6"/>'),
  close: svg('<path d="M4 4l8 8M12 4l-8 8"/>'),
  folder: svg('<path d="M1.5 4h4l1.4 1.6h7.6V13H1.5z"/>'),
  check: svg('<path d="M3 8.5l3.2 3.2L13 4.5"/>'),
  cross: svg('<circle cx="8" cy="8" r="6"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4"/>'),
  warning: svg('<path d="M8 2l6.2 11H1.8z"/><path d="M8 6.4v3M8 11.2v.1"/>'),
  info: svg('<circle cx="8" cy="8" r="6"/><path d="M8 7.2v4M8 4.9v.1"/>'),
  bell: svg('<path d="M4 7a4 4 0 018 0c0 3 1 4 1 4H3s1-1 1-4z"/><path d="M6.6 13.2a1.6 1.6 0 002.8 0"/>'),
  prompt: svg('<path d="M2.5 3.5L7 8l-4.5 4.5M8.5 12.5h5"/>'),
  bolt: svg('<path d="M9 1.5L3.5 9.2h4L7 14.5l5.5-7.7h-4z"/>'),
  shield: svg('<path d="M8 1.6l5 2v4.2c0 3-2.2 5.4-5 6.6-2.8-1.2-5-3.6-5-6.6V3.6z"/>'),
  ruler: svg('<rect x="1.5" y="5" width="13" height="6" rx="1"/><path d="M4.5 5v2.4M7 5v3.4M9.5 5v2.4M12 5v3.4"/>'),
  copy: svg('<rect x="5.5" y="5.5" width="8" height="8" rx="1"/><path d="M10.5 5.5v-3h-8v8h3"/>'),
  external: svg('<path d="M9.5 2.5H13.5v4"/><path d="M13.5 2.5L8 8"/><path d="M12 9.5v3.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-8a.5.5 0 01.5-.5H6.5"/>'),
} as const;

export type IconName = keyof typeof icons;
