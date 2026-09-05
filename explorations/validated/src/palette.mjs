export const BASE_HUE = 264;
export const BASE_CHROMA = 0.016;

export const NEUTRAL_LIGHTNESS = {
  editor: 0.195, terminal: 0.207, sidebar: 0.220, widget: 0.250,
  input: 0.285, hover: 0.320, hairline: 0.375, divider: 0.440,
  border: 0.520, muted: 0.580, textSecondary: 0.745, textPrimary: 0.930,
};

export const neutral = Object.fromEntries(
  Object.entries(NEUTRAL_LIGHTNESS).map(([k, L]) => [k, [L, BASE_CHROMA, BASE_HUE]]),
);

export const ACCENTS = {
  coral:  [0.740, 0.135,  22],
  copper: [0.765, 0.125,  52],
  gold:   [0.840, 0.130,  90],
  green:  [0.800, 0.130, 148],
  teal:   [0.800, 0.105, 192],
  blue:   [0.775, 0.115, 255],
  violet: [0.760, 0.125, 305],
};

const SUBTLE_LIGHTNESS = 0.255;
const BORDER_LIGHTNESS = 0.520;

export const accentScale = (name) => {
  const [L, C, H] = ACCENTS[name];
  return {
    subtle: [SUBTLE_LIGHTNESS, Math.min(C * 0.42, 0.055), H],
    border: [BORDER_LIGHTNESS, Math.min(C * 0.62, 0.085), H],
    solid: [L, C, H],
  };
};

export const SYNTAX = {
  variable: 'coral', number: 'copper', constant: 'copper', type: 'gold',
  string: 'green', operator: 'teal', escape: 'teal', function: 'blue', keyword: 'violet',
};

export const ONE_DARK_PRO_HUE = {
  variable: 17.0, number: 63.8, constant: 63.8, type: 82.3,
  string: 133.0, operator: 206.3, escape: 206.3, function: 245.3, keyword: 318.2,
};

export const comment = [0.600, BASE_CHROMA + 0.008, BASE_HUE];

export const STATUS = { success: 'green', warning: 'copper', error: 'coral', info: 'blue' };

export const diff = {
  addedFill:   [0.300, 0.055, ACCENTS.green[2]],
  removedFill: [0.240, 0.060, ACCENTS.coral[2]],
  addedGutter: ACCENTS.green,
  removedGutter: ACCENTS.coral,
};

export const overlay = {
  selection: { color: neutral.border, alpha: 0.22 },
  findMatch: { color: ACCENTS.gold, alpha: 0.30 },
  findMatchOther: { color: ACCENTS.gold, alpha: 0.16 },
  wordHighlight: { color: neutral.hover, alpha: 0.55 },
  lineHighlight: { color: neutral.sidebar, alpha: 0.65 },
};

export const bracketPairs = ['gold', 'teal', 'violet'];
export const cursor = ACCENTS.gold;

const BRIGHT_TO_NORMAL = 0.06;
const ansiHue = { red: 'coral', green: 'green', yellow: 'gold', blue: 'blue', magenta: 'violet', cyan: 'teal' };

export const ansi = (() => {
  const out = {};
  for (const [slot, accent] of Object.entries(ansiHue)) {
    const [L, C, H] = ACCENTS[accent];
    out[slot] = [L - BRIGHT_TO_NORMAL, C, H];
    out[`bright${slot[0].toUpperCase()}${slot.slice(1)}`] = [L, C, H];
  }
  out.black = [0.300, BASE_CHROMA, BASE_HUE];
  out.brightBlack = [0.600, BASE_CHROMA, BASE_HUE];
  out.white = neutral.textSecondary;
  out.brightWhite = neutral.textPrimary;
  return out;
})();

export const terminalBackground = neutral.editor;

export const CHROMA_CEILING = { gold: 0.17, green: 0.17, blue: 0.13, violet: 0.13 };
export const CHROMA_DEFAULT = [0.09, 0.15];
export const HUE_DRIFT_LIMIT = 15;
export const CONTRAST_FLOOR = 4.5;
export const NON_TEXT_FLOOR = 3.0;
export const MEANING_PAIR_GAP = 0.06;
export const CONTRAST_EXEMPT = new Set(['muted', 'hairline', 'divider', 'ansi.black', 'ansi.white']);
