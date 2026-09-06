import { ANSI_ORDER, ansi, cursor, hex, neutral, terminalBackground, terminalSelection } from '@sltsh/aion-tokens';
import type { AnsiSlot } from '@sltsh/aion-tokens';

export interface Scheme {
  readonly name: string;
  readonly background: string;
  readonly foreground: string;
  readonly cursorColor: string;
  readonly selectionBackground: string;
  readonly black: string;
  readonly red: string;
  readonly green: string;
  readonly yellow: string;
  readonly blue: string;
  readonly purple: string;
  readonly cyan: string;
  readonly white: string;
  readonly brightBlack: string;
  readonly brightRed: string;
  readonly brightGreen: string;
  readonly brightYellow: string;
  readonly brightBlue: string;
  readonly brightPurple: string;
  readonly brightCyan: string;
  readonly brightWhite: string;
}

// Windows Terminal calls the magenta slots "purple". Everything else keeps its own name.
const SLOT_NAME: Record<AnsiSlot, keyof Scheme> = {
  black: 'black', red: 'red', green: 'green', yellow: 'yellow', blue: 'blue',
  magenta: 'purple', cyan: 'cyan', white: 'white',
  brightBlack: 'brightBlack', brightRed: 'brightRed', brightGreen: 'brightGreen',
  brightYellow: 'brightYellow', brightBlue: 'brightBlue', brightMagenta: 'brightPurple',
  brightCyan: 'brightCyan', brightWhite: 'brightWhite',
};

export const scheme = (): Scheme => {
  const slots = Object.fromEntries(
    ANSI_ORDER.map((slot) => [SLOT_NAME[slot], hex(ansi[slot])]),
  ) as Pick<Scheme, 'black'>;
  return {
    name: 'Aion',
    // The standalone terminal takes the editor value, one step below the VS Code panel.
    background: hex(terminalBackground),
    foreground: hex(neutral.textSecondary),
    cursorColor: hex(cursor),
    selectionBackground: hex(terminalSelection),
    ...slots,
  } as Scheme;
};

export const fragment = () => ({
  $schema: 'https://aka.ms/terminal-profiles-schema',
  schemes: [scheme()],
});

export const settingsSnippet = () => ({ schemes: [scheme()] });
