export type Token = readonly [className: string, text: string];

export interface CodeLine {
  readonly tokens: readonly Token[];
  readonly change?: 'added' | 'removed';
  readonly current?: boolean;
  readonly caret?: boolean;
}

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const t = (className: string) => (text: string): Token => [className, text];

export const kw = t('t-keyword');
export const fn = t('t-function');
export const ty = t('t-type');
export const st = t('t-string');
export const nu = t('t-number');
export const va = t('t-variable');
export const op = t('t-operator');
export const cm = t('t-comment');
export const pn = t('t-punctuation');
export const co = t('t-constant');
export const es = t('t-escape');
export const sel = t('t-selected');
export const hl = t('t-word-highlight');
export const fo = t('t-find-other');
export const fc = t('t-find-current');
export const sp = t('t-plain');
export const b1 = t('b1');
export const b2 = t('b2');
export const b3 = t('b3');

// The characters a diff changed inside a line it also fills. VS Code paints the two with
// `insertedTextBackground` over `insertedLineBackground`, so the lab stacks the classes.
export const dw = (token: Token): Token => [`${token[0]} diff-word`, token[1]];

export const TYPESCRIPT: readonly CodeLine[] = [
  { tokens: [cm('// Every colour below is solved, never chosen.')] },
  { tokens: [kw('import'), sp(' '), b1('{'), sp(' '), va('solveLightness'), pn(', '), va('contrastEmitted'), sp(' '), b1('}'), sp(' '), kw('from'), sp(' '), st("'@sltio/aion-tokens'"), pn(';')] },
  { tokens: [] },
  { tokens: [kw('export'), sp(' '), kw('async'), sp(' '), kw('function'), sp(' '), fn('loadEpoch'), b1('('), va('id'), pn(': '), ty('string'), b1(')'), pn(': '), ty('Promise'), op('<'), ty('Epoch'), op('>'), sp(' '), b1('{')] },
  { tokens: [sp('  '), cm('// resolve the age from the registry')] },
  { tokens: [sp('  '), kw('const'), sp(' '), co('FLOOR'), sp(' '), op('='), sp(' '), nu('4.5'), pn('; '), cm('// the floor every body text pair must clear')] },
  { tokens: [sp('  '), kw('const'), sp(' '), sel('entry'), sp(' '), op('='), sp(' '), kw('await'), sp(' '), va('registry'), pn('.'), fn('get'), b2('('), sel('id'), b2(')'), pn(';')] },
  { tokens: [sp('  '), kw('if'), sp(' '), b2('('), op('!'), fc('entry'), b2(')'), sp(' '), kw('throw'), sp(' '), kw('new'), sp(' '), ty('NotFoundError'), b3('('), st('`no epoch '), es('${'), va('id'), es('}'), st(String.raw`\n`), st('`'), b3(')'), pn(';')] },
  { tokens: [] },
  { tokens: [sp('  '), kw('return'), sp(' '), b2('{')] },
  { tokens: [sp('    '), va('label'), pn(': '), fo('entry'), pn('.'), dw(va('name')), pn(',')], change: 'removed' },
  { tokens: [sp('    '), va('label'), pn(': '), va('entry'), pn('.'), dw(va('label')), dw(sp(' ')), dw(op('??')), dw(sp(' ')), dw(va('id')), pn(',')], change: 'added' },
  { tokens: [sp('    '), va('span'), pn(': '), nu('1_440'), sp(' '), op('*'), sp(' '), nu('365'), pn(',')] },
  { tokens: [sp('    '), hl('ratio'), pn(': '), fn('contrastEmitted'), b3('('), va('fg'), pn(', '), va('bg'), b3(')'), pn(',')], current: true },
  { tokens: [sp('    '), va('eternal'), pn(': '), kw('true'), pn(',')], caret: true },
  { tokens: [sp('  '), b2('}'), pn(';')] },
  { tokens: [b1('}')] },
];

const renderLine = (line: CodeLine): string => {
  const body = line.tokens
    .map(([className, text]) => `<span class="${className}">${escapeHtml(text)}</span>`)
    .join('');
  return body + (line.caret ? '<span class="caret"></span>' : '');
};

const gutterMark = (line: CodeLine): string => {
  if (line.change === 'added') return '<span class="gutter-added">+</span>';
  if (line.change === 'removed') return '<span class="gutter-removed">&minus;</span>';
  return '';
};

export function renderCode(lines: readonly CodeLine[]): string {
  const rows = lines
    .map((line, index) => {
      const classes = ['code-line'];
      if (line.change) classes.push(`is-${line.change}`);
      if (line.current) classes.push('is-current');
      return `<div class="code-row ${line.change ? `is-${line.change}` : ''}">
        <span class="code-gutter">${gutterMark(line)}<span class="code-number${
          line.current ? ' is-current' : ''
        }">${index + 1}</span></span>
        <span class="${classes.join(' ')}">${renderLine(line) || '&nbsp;'}</span>
      </div>`;
    })
    .join('');
  return `<div class="code">${rows}</div>`;
}
