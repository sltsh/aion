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

export const PITCH = 'A theme for editors, terminals and the web.';
