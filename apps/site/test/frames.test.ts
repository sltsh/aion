import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { dark, light } from '@sltsh/aion-css';
import { variables } from '@sltsh/aion-lab/variables';
import { buildPalette, distanceEmitted, hexToOklch, lightPalette } from '@sltsh/aion-tokens';

const stylesheet = (): string => readFileSync(new URL('../src/styles/frames.css', import.meta.url), 'utf8');

test('Light frame edges clear the visibility floor and Dark retains its hairline', () => {
  const css = stylesheet();
  const bindings = [...css.matchAll(/--site-frame-edge:\s*var\((--n-[\w-]+)\)/g)].map(match => match[1]!);
  expect(bindings).toEqual(['--n-hairline', '--n-divider', '--n-divider']);
  for (const [palette, emitted, key, scheme] of [
    [buildPalette(), dark(), bindings[0]!, 'dark'],
    [lightPalette, light(), bindings[1]!, 'light'],
  ] as const) {
    const values = variables(palette);
    const edge = hexToOklch(values[key]!);
    const background = hexToOklch(emitted['--aion-bg-surface']!);
    const distance = distanceEmitted(edge, background);
    if (scheme === 'light') expect(distance).toBeGreaterThanOrEqual(.03);
    else expect(distance).toBeLessThanOrEqual(distanceEmitted(hexToOklch(values['--n-hairline']!), background));
  }
});

test('site frame rules cover editor, code, terminal and preview boundaries without effects', () => {
  const css = stylesheet();
  for (const selector of ['.diptych .window', '.depth-frame .window', '.states-code', '.terminal-sessions', '.install-thumbnail', '.install-editor .window']) {
    expect(css).toContain(selector);
  }
  expect(css).not.toMatch(/shadow|gradient|filter\s*:/);
  expect(css).toContain('border-color: var(--site-frame-edge)');
});

test('opposite-scheme previews resolve their own frame edge', () => {
  const css = stylesheet();
  expect(css).toContain(':root, [data-theme]');
  expect(css).toContain('[data-theme="light"]');
  expect(css).toContain(':root:not([data-theme])');
});
