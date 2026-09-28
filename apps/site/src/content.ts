export const CHAPTERS = [
  { id: 'depth', number: '01', title: 'Depth' },
  { id: 'solved', number: '02', title: 'Solved' },
  { id: 'rounded', number: '03', title: 'Rounded' },
  { id: 'states', number: '04', title: 'States' },
  { id: 'terminal', number: '05', title: 'Terminal' },
  { id: 'palette', number: '06', title: 'Palette' },
  { id: 'install', number: '', title: 'Install' },
] as const;
export const SHELL = {
  skip: 'Skip to content', home: 'Aion home', menu: 'Menu', navigation: 'Main navigation',
  footerNavigation: 'Footer navigation', chapters: 'Chapters', lightTheme: 'Light theme',
  darkLabel: 'Aion', lightLabel: 'Light', github: 'Aion on GitHub',
  navDepth: 'Depth', navProof: 'Proof', navInstall: 'Install', navPalette: 'Palette',
  explore: 'Explore the palette', source: 'GitHub', design: 'Design notes',
} as const;
export const CONTENT = {
  copy: { label: 'Copy', copied: 'Copied', success: 'Copied to clipboard', unavailable: 'Copy is unavailable. Select and copy the text instead.', failed: 'Could not copy. Select and copy the text instead.' },
  paletteChapter: {
    title: 'Eight colours. One file.', lede: 'Each colour sits at its measured contrast against the editor. Point at a colour to see where it is used.', floor: 'floor 4.5:1', uses: 'in the file', fileName: 'src/tide.ts',
    examples: { keyword: 'async', function: 'solve', type: 'Epoch', string: "'utf8'", number: '4.5', variable: 'entry', operator: '=>', comment: '// why' },
    file: [
      [['comment', '// predict the next high water']],
      [['keyword', 'async function'], ['plain', ' '], ['function', 'predict'], ['plain', '('], ['variable', 'entry'], ['plain', ': '], ['type', 'Epoch'], ['plain', ') {']],
      [['plain', '  '], ['keyword', 'const'], ['plain', ' '], ['variable', 'floor'], ['plain', ' '], ['operator', '='], ['plain', ' '], ['number', '4.5'], ['plain', ';']],
      [['plain', '  '], ['keyword', 'const'], ['plain', ' '], ['variable', 'next'], ['plain', ' '], ['operator', '='], ['plain', ' '], ['keyword', 'await'], ['plain', ' '], ['function', 'solve'], ['plain', '('], ['variable', 'entry'], ['plain', ', '], ['string', "'utf8'"], ['plain', ');']],
      [['plain', '  '], ['keyword', 'return'], ['plain', ' '], ['variable', 'next'], ['plain', ' '], ['operator', '??'], ['plain', ' '], ['number', '0'], ['plain', ';']],
      [['plain', '}']],
    ],
  },
  install: {
    title: 'Pick where you read code.', scope: 'Every target here is generated from the same tokens and passes the same gate.',
    preview: { vault: 'Vault', daily: 'Daily', notes: 'Aion notes', reading: 'Reading', heading: 'Solved, never chosen', body: 'The same tokens as the editor.', link: 'A link', tag: '#depth', subheading: 'Why the editor is the extreme', quote: 'Your code is the deepest thing on the screen.' },
    cssCode: "@import '@sltsh/aion-css/aion.css';\n\n.panel {\n  background: var(--aion-bg-raised);\n  color: var(--aion-fg-primary);\n}",
  },
  states: {
    title: 'Code remains legible with things on top of it.',
    lede: 'Select, search or diff. Stack the states VS Code can draw and watch each colour stay above the floor.',
    toolbar: 'Reading states', codeLabel: 'Three lines of code with reading states', background: 'background', lowest: 'lowest', floor: 'floor 4.5:1',
    empty: 'Nothing on. Turn on what VS Code draws over the first two lines.',
    stacked: (names: string): string => `Under the first two lines: ${names}.`,
    noScript: 'The code and ratios show the current scheme. Enable JavaScript to stack its states.',
    caption: 'These controls cover a named set of reading states, not every combination an editor can produce.',
    reasons: {
      currentSelection: 'VS Code draws the current line only while nothing is selected, so these two never stack.',
      diffSides: 'A line is either added or removed, so those states never stack.',
      outsideCoverage: 'This combination is outside the measured reading states.',
    },
    labels: { lineHighlight: 'current line', selection: 'selection', wordHighlight: 'word highlight', findMatchOther: 'other find matches', addedLine: 'added line', addedWord: 'added word', removedLine: 'removed line', removedWord: 'removed word' },
    code: [
      [['comment', '// resolve the age from the registry']],
      [['keyword', 'const'], ['plain', ' '], ['variable', 'entry'], ['plain', ' '], ['operator', '='], ['plain', ' '], ['keyword', 'await'], ['plain', ' '], ['variable', 'registry'], ['punctuation', '.'], ['function', 'get'], ['punctuation', '('], ['variable', 'id'], ['punctuation', ');']],
      [['keyword', 'return'], ['plain', ' '], ['type', 'Epoch'], ['punctuation', '.'], ['function', 'of'], ['punctuation', '('], ['variable', 'entry'], ['punctuation', ','], ['plain', ' '], ['number', '1_440'], ['plain', ' '], ['operator', '*'], ['plain', ' '], ['number', '365'], ['punctuation', ');']],
    ],
  },
  terminal: {
    title: 'Sixteen slots, measured on both backgrounds.',
    lede: 'The same colours in a standalone terminal and a VS Code panel. Each slot is measured wherever it ships.',
    lightLede: 'The Light slots are measured on the panel and its terminal selection. No Light standalone scheme ships.',
    exempt: 'exempt as text', measured: 'slots × measured backgrounds',
    sessionLabel: (name: string): string => `${name} terminal session`,
    exemptCaption: (slots: string): string => `Slot ${slots} is exempt as a text colour. SGR 30 selects slot 0, so programs can still print hard-to-read text in it: a real limitation. Its guarantee is text printed on top of it.`,
    noExemptCaption: (ratio: string): string => `No slot is exempt. Every slot reads as text on both measured backgrounds, the lowest at ${ratio}:1.`,
    session: [
      [['green', '~/tidal'], ['blue', ' main'], ['brightBlack', ' $'], ['white', ' git status']],
      [['white', 'On branch '], ['cyan', 'main']],
      [['red', '  modified:   src/tide.ts']],
      [['green', '  new file:   test/tide.test.ts']],
      [['green', '~/tidal'], ['brightBlack', ' $'], ['white', ' node --test']],
      [['green', '✔'], ['white', ' predicts the next high water '], ['brightBlack', '(2.1ms)']],
      [['yellow', '⚠'], ['white', ' 1 test skipped · '], ['magenta', 'tests 5'], ['white', ' · '], ['brightGreen', 'pass 5'], ['white', ' · '], ['brightRed', 'fail 0']],
    ],
  },
  solved: {
    title: 'Every colour is solved, never chosen.',
    lede: 'Each accent is solved against the worst surface it can land on. Pick one and drag it until it fails.',
    accents: 'Syntax accents', lightness: 'Accent lightness', hold: 'Let the solver hold the floor',
    on: 'on', passes: 'Passes on its worst surface,', fails: 'Fails on', floor: 'floor 4.5:1', shipped: 'shipped', scale: 'Contrast against the floor and shipped value',
    caption: 'Measured from emitted bytes over seven surfaces: editor, current line, selection, word highlight, selection with word highlight, hover widget and find match.',
  },
  rounded: {
    title: 'Your screen shows a rounded colour. Aion measures that one.',
    steps: [
      { title: 'Designed exactly.', body: 'Each colour starts as a precise value, with as many decimals as it needs.' },
      { title: 'Sent rounded.', body: 'Your display only takes three whole numbers from 0 to 255, so every channel is rounded.' },
      { title: 'Measured as sent.', body: 'Rounding can turn a pass into a fail. The gate reads the rounded colour, the one you see.' },
    ],
    lightness: 'Lightness of the example colour', find: 'Find a pass that fails',
    exact: 'exact', screen: 'on your screen', gap: 'gap', pass: 'passes', fail: 'fails',
    directions: { up: 'rounds up', down: 'rounds down', exact: 'exact' },
    flipNote: 'The exact colour passes and the one on your screen fails. A gate that read the exact value would ship this.',
    helpNote: 'Here rounding happens to help. The gate still reads the rounded value.',
    dragNote: 'Drag across the floor: the two numbers cross it at different points.',
    caption: 'An example colour at the comment’s hue, near the floor, on the current scheme’s editor.',
  },
  claims: {
    eyebrow: 'The proof', title: 'Six claims. Each one measured.',
    extremes: {
      darkest: { figure: 'Darkest', sentence: 'The editor is the darkest surface in Aion. Every bar, panel and widget steps up from it by a measured amount.' },
      lightest: { figure: 'Lightest', sentence: 'The editor is the lightest surface in Aion Light. Every bar, panel and widget steps down from it by a measured amount.' },
    },
    solved: 'The lowest contrast of any shown syntax colour on the editor. The floor is 4.5:1.',
    rounded: 'The largest observed rounding shift near the floor on the documented grid. Aion measures the rounded colour.',
    states: 'Select, search or diff: code remains legible in the reading states Aion measures.',
    terminal: { dark: 'Every terminal colour, measured on the standalone terminal and the VS Code panel.', light: 'Every terminal colour, measured on the Light panel and the Light terminal selection.' },
    palette: 'Syntax colours, each placed by its measured contrast.',
    actions: ['Take the editor apart', 'Drag a colour', 'Watch it round', 'Stack the states', 'See the slots', 'Measure a colour'],
  },
  depth: {
    title: 'Your code is the deepest thing on the screen.',
    lede: { dark: 'VS Code’s defaults put the sidebar below the editor. Aion reverses that: the editor is the darkest surface, and every bar, panel and widget steps up from it by a measured amount, so your code sits at the bottom of the stack.', light: 'In Aion Light the editor is the lightest surface, and every bar, panel and widget steps down from it by a measured amount. Either way your code sits on the extreme surface, and everything else stands back from it.' },
    putTogether: 'Put it together', takeApart: 'Take it apart', ruler: 'Strata, measured against the editor',
    parts: 'Editor parts, measured against the editor',
  },
  intro: { label: 'Aion syntax colours', wordmark: 'Aion', skip: 'Any key skips' },
  hero: {
    headline: ['Your code is', 'the deepest thing', 'on the screen.'],
    sub: 'Gold marks where you are. Every colour is solved, never chosen.',
    install: 'Install for VS Code', openVsx: 'Open VSX',
    slider: 'Share of the hero shown in the other scheme', darkName: 'Aion', lightName: 'Aion Light',
    marketplace: 'https://marketplace.visualstudio.com/items?itemName=sltsh.aion-theme',
    registry: 'https://open-vsx.org/extension/sltsh/aion-theme',
  },
  pitch: "A theme for editors, terminals and the web.",
  heroDetail: "Gold accents. Cool surfaces. Familiar syntax. No italics.",
  editorNote: "Familiar syntax. No italics.",
  paletteNote: "One palette, every surface.",
  essentialsTitle: "Make it yours.",
  essentialsIntro: "The essentials for bringing Aion to another app.",
  copyHint: "Hex values remain selectable. Copy when controls are available.",
  paletteLink: "Colour roles, terminal colours, and everything you need to get started.",
  installTitle: "Aion, in your workspace.",
  installIntro: "Choose your app. Bring the same colours with you.",
  packagePrompt: "Working directly with colour?",
  releasedCssNote: "The same palette for your own interfaces. CSS custom properties and a Tailwind theme, ready to import.",
  gateTitle: "Colour with a purpose.",
  gateIntro: "Readable text, clear focus, and decorations that keep code legible.",
  gateScope: "Aion checks contrast across a named set of reading states. It doesn’t claim to cover every state an app can produce.",
  footerPitch: "Gold, teal, and room to focus.",
  sourceLicense: "Aion source: MIT licensed.",
  fontLicense: "Archivo & Monaspace Neon · SIL Open Font License 1.1",
  footerDesignHint: "The thinking behind the theme",
  footerPaletteHint: "Find your colours",
  footerSourceHint: "Source & contributions",
  editorDepth: { dark: "The editor is the darkest surface.", light: "The editor is the lightest surface." },
} as const;

export interface InstallEntry {
  readonly id: string;
  readonly label: string;
  readonly command: string;
  readonly localCommand: string;
  readonly note: string;
  readonly action: string;
  readonly href: string;
}

export const INSTALL: readonly InstallEntry[] = [
  { id: 'vscode', label: 'VS Code', note: 'Marketplace', command: 'code --install-extension sltsh.aion-theme', localCommand: 'code --install-extension sltsh.aion-theme', action: 'Marketplace', href: 'https://marketplace.visualstudio.com/items?itemName=sltsh.aion-theme' },
  { id: 'obsidian', label: 'Obsidian', note: 'Community themes', command: 'Settings / Appearance / Themes / Aion', localCommand: 'Settings / Appearance / Themes / Aion', action: 'Obsidian directory', href: 'https://obsidian.md/themes?search=Aion' },
  { id: 'ovsx', label: 'Cursor, Windsurf, VSCodium', note: 'Open VSX', command: 'Search the extensions view for Aion', localCommand: 'Search the extensions view for Aion', action: 'Open VSX', href: 'https://open-vsx.org/extension/sltsh/aion-theme' },
  { id: 'wt', label: 'Windows Terminal', note: 'aion.json', command: 'Add aion.json to the schemes in settings.json', localCommand: 'Add aion.json to the schemes in settings.json', action: 'Download aion.json', href: '/downloads/aion.json' },
  { id: 'css', label: 'CSS / Tailwind', note: 'npm', command: 'npm install @sltsh/aion-css', localCommand: 'npm run build', action: 'CSS package', href: 'https://www.npmjs.com/package/@sltsh/aion-css' },
];

export const UNRELEASED_NOTE =
  'The terminal download is ready. VS Code and npm packages await the first release. For the local CSS build, clone the repository and run npm install first.';

export const PITCH = CONTENT.pitch;
