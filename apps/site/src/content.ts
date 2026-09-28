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
  {
    id: 'vscode', label: 'VS Code',
    command: 'code --install-extension sltsh.aion-theme',
    localCommand: 'code --install-extension sltsh.aion-theme',
    note: 'Familiar syntax, gold focus accents, and no italics. Install the extension, then select Aion as your colour theme.',
    action: 'Install from Marketplace', href: 'https://marketplace.visualstudio.com/items?itemName=sltsh.aion-theme',
  },
  {
    id: 'terminal', label: 'Windows Terminal (dark scheme)',
    command: '%LOCALAPPDATA%\\Microsoft\\Windows Terminal\\Fragments\\sltsh',
    localCommand: '%LOCALAPPDATA%\\Microsoft\\Windows Terminal\\Fragments\\sltsh',
    note: 'Save the file in this folder (create it if needed). Restart Terminal and choose Aion in Settings → Profiles → Appearance → Colour scheme.',
    action: 'Download aion.json', href: '/downloads/aion.json',
  },
  {
    id: 'css', label: 'CSS & Tailwind',
    command: 'npm install @sltsh/aion-css', localCommand: 'npm run build',
    note: 'The same palette for your own interfaces. CSS custom properties and a Tailwind theme, ready to use after a local build.',
    action: 'CSS setup', href: 'https://github.com/sltsh/aion/tree/main/packages/css',
  },
];

export const UNRELEASED_NOTE =
  'The terminal download is ready. VS Code and npm packages await the first release. For the local CSS build, clone the repository and run npm install first.';

export const PITCH = CONTENT.pitch;
