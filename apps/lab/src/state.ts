import type { ColourScheme, Palette, PreviewOptions } from '@sltsh/aion-tokens';
import { LIGHT_PREVIEW_DEFAULTS, PREVIEW_DEFAULTS, buildSchemePalette } from '@sltsh/aion-tokens';

export interface LabState {
  readonly activeScheme: ColourScheme;
  readonly options: Record<ColourScheme, PreviewOptions>;
}

export interface LabController {
  getState(): LabState;
  getActiveScheme(): ColourScheme;
  getActiveOptions(): PreviewOptions;
  getActivePalette(): Palette;
  setScheme(scheme: ColourScheme): void;
  setControl(key: keyof PreviewOptions, value: number): void;
  resetActive(): void;
  subscribe(listener: (state: LabState, palette: Palette) => void): () => void;
}

export function createLabController(
  initialScheme: ColourScheme = 'dark',
  initialDark: Partial<PreviewOptions> = {},
  initialLight: Partial<PreviewOptions> = {},
): LabController {
  let activeScheme: ColourScheme = initialScheme;
  const options: Record<ColourScheme, PreviewOptions> = {
    dark: { ...PREVIEW_DEFAULTS, ...initialDark },
    light: { ...LIGHT_PREVIEW_DEFAULTS, ...initialLight },
  };
  const listeners = new Set<(state: LabState, palette: Palette) => void>();

  const getState = (): LabState => ({
    activeScheme,
    options: {
      dark: { ...options.dark },
      light: { ...options.light },
    },
  });

  const getActivePalette = (): Palette =>
    buildSchemePalette(activeScheme, options[activeScheme]);

  const notify = (): void => {
    const s = getState();
    const p = getActivePalette();
    for (const listener of listeners) {
      listener(s, p);
    }
  };

  return {
    getState,
    getActiveScheme: () => activeScheme,
    getActiveOptions: () => ({ ...options[activeScheme] }),
    getActivePalette,
    setScheme(scheme: ColourScheme): void {
      if (activeScheme === scheme) return;
      activeScheme = scheme;
      notify();
    },
    setControl(key: keyof PreviewOptions, value: number): void {
      options[activeScheme] = { ...options[activeScheme], [key]: value };
      notify();
    },
    resetActive(): void {
      options[activeScheme] = activeScheme === 'light'
        ? { ...LIGHT_PREVIEW_DEFAULTS }
        : { ...PREVIEW_DEFAULTS };
      notify();
    },
    subscribe(listener: (state: LabState, palette: Palette) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
