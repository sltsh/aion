import { buildPalette, lightPalette } from '@sltsh/aion-tokens';
import { variables } from '@sltsh/aion-lab/variables';

const block = (selector: string, values: Record<string, string>): string =>
  `${selector} {\n${Object.entries(values).map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}`;

export function schemeStyles(): string {
  const dark = variables(buildPalette());
  const light = variables(lightPalette);
  return `<style id="aion-scheme">${block(':root', dark)}
@media (prefers-color-scheme: light) { ${block(':root:not([data-theme])', light)} }
${block(':root[data-theme="dark"], [data-theme="dark"]', dark)}
${block(':root[data-theme="light"], [data-theme="light"]', light)}</style>`;
}
