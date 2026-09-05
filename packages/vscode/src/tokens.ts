import { syntaxHex as c } from './colors.js';

export interface TokenRule {
  readonly name: string;
  readonly scope: string[];
  readonly settings: { readonly foreground?: string; readonly fontStyle?: string };
}

const rule = (name: string, foreground: string, scope: string[]): TokenRule =>
  ({ name, scope, settings: { foreground } });

export const tokenColors: TokenRule[] = [
  rule('Comment', c.comment, [
    'comment', 'punctuation.definition.comment', 'string.comment',
  ]),
  rule('Punctuation', c.punctuation, [
    'punctuation', 'meta.brace', 'punctuation.definition.parameters',
    'punctuation.separator', 'punctuation.terminator', 'punctuation.accessor',
  ]),
  rule('Variable, property, parameter', c.variable, [
    'variable', 'variable.other', 'variable.other.readwrite', 'variable.parameter',
    'meta.definition.variable.name', 'support.variable', 'entity.name.variable',
    'variable.other.property', 'variable.other.object.property', 'support.type.property-name',
    'meta.object-literal.key', 'entity.name.tag',
  ]),
  rule('Number and constant', c.number, [
    'constant.numeric', 'constant.language', 'constant.other.placeholder',
    'constant.other.caps', 'keyword.other.unit', 'support.constant',
    'variable.other.constant', 'entity.name.constant',
  ]),
  rule('Type and class', c.type, [
    'entity.name.type', 'entity.name.class', 'entity.name.namespace', 'entity.name.scope-resolution',
    'entity.other.inherited-class', 'support.type', 'support.class', 'storage.type.annotation',
    'meta.type.annotation entity.name.type', 'entity.name.type.parameter',
  ]),
  rule('String', c.string, [
    'string', 'string.quoted', 'string.template', 'constant.other.symbol',
    'punctuation.definition.string', 'markup.inserted',
  ]),
  rule('Operator and escape', c.operator, [
    'keyword.operator', 'keyword.operator.logical', 'keyword.operator.arithmetic',
    'keyword.operator.assignment', 'keyword.operator.comparison', 'constant.character.escape',
    'punctuation.definition.template-expression', 'punctuation.section.embedded',
  ]),
  rule('Function and method', c.function, [
    'entity.name.function', 'support.function', 'meta.function-call.generic',
    'variable.function', 'meta.function entity.name.function', 'entity.name.function.member',
  ]),
  rule('Keyword and storage', c.keyword, [
    'keyword', 'keyword.control', 'keyword.other', 'storage', 'storage.type',
    'storage.modifier', 'variable.language', 'keyword.declaration',
  ]),
  rule('Decorator', c.gold, ['meta.decorator', 'entity.name.function.decorator', 'punctuation.decorator']),
  rule('Invalid', c.coral, ['invalid', 'invalid.illegal']),
  { name: 'Deprecated', scope: ['invalid.deprecated'], settings: { foreground: c.dim, fontStyle: 'strikethrough' } },
  // `constant.other.character-class` rather than `.regexp`: the grammar also emits
  // `.range.regexp` and `.set.regexp`, which a selector ending in `.regexp` never matches.
  rule('Regular expression', c.green, ['string.regexp', 'constant.other.character-class']),
  rule('Regular expression operator', c.teal, [
    'keyword.operator.or.regexp', 'keyword.control.anchor.regexp',
    'constant.character.control.regexp', 'constant.character.numeric.regexp',
  ]),
  rule('Documentation comment', c.comment, [
    'constant.other.description.jsdoc', 'constant.other.email.link.underline.jsdoc',
  ]),
  rule('Label', c.gold, ['entity.name.label']),
  rule('Character entity', c.number, [
    'constant.character.entity', 'punctuation.definition.entity',
  ]),

  rule('Markdown heading', c.coral, ['markup.heading', 'entity.name.section.markdown']),
  rule('Markdown heading punctuation', c.copper, ['punctuation.definition.heading.markdown']),
  { name: 'Markdown bold', scope: ['markup.bold'], settings: { foreground: c.copper, fontStyle: 'bold' } },
  rule('Markdown italic', c.violet, ['markup.italic']),
  rule('Markdown inline code', c.green, ['markup.inline.raw', 'markup.fenced_code.block', 'fenced_code.block.language']),
  rule('Markdown link text', c.blue, ['string.other.link.title.markdown', 'markup.underline.link']),
  rule('Markdown link url', c.teal, ['markup.underline.link.markdown', 'string.other.link.description.markdown']),
  rule('Markdown list marker', c.coral, ['punctuation.definition.list.begin.markdown', 'beginning.punctuation.definition.list.markdown']),
  rule('Markdown quote', c.violet, ['markup.quote', 'punctuation.definition.quote.begin.markdown']),
  rule('Markdown separator', c.dim, ['meta.separator.markdown']),
  rule('Markdown deleted', c.coral, ['markup.deleted']),
  rule('Markdown changed', c.copper, ['markup.changed']),
  // The grid is what makes a table readable, so the rules carry the colour and the cells
  // keep body text. `markup.table` is stated rather than inherited, so a cell cannot pick
  // up a colour from a rule that happens to match its content.
  rule('Markdown table', c.punctuation, ['markup.table']),
  rule('Markdown table rules', c.teal, [
    'punctuation.definition.table.markdown', 'punctuation.separator.table.markdown',
  ]),
  { name: 'Markdown strikethrough', scope: ['markup.strikethrough'],
    settings: { foreground: c.dim, fontStyle: 'strikethrough' } },
  rule('Markdown strikethrough punctuation', c.punctuation, ['punctuation.definition.strikethrough.markdown']),
  rule('Markdown indented code', c.green, ['markup.raw.block']),
  rule('Markdown reference link', c.blue, ['constant.other.reference.link.markdown']),

  rule('JSON key', c.variable, ['support.type.property-name.json', 'meta.structure.dictionary.key.json']),
  rule('JSON string', c.string, ['string.quoted.double.json']),
  rule('JSON constant', c.number, ['constant.language.json']),
  rule('JSON punctuation', c.punctuation, ['punctuation.separator.dictionary.key-value.json', 'punctuation.definition.dictionary.json']),

  rule('YAML key', c.variable, ['entity.name.tag.yaml', 'punctuation.definition.key-value.yaml']),
  rule('YAML string', c.string, ['string.unquoted.plain.out.yaml', 'string.quoted.single.yaml', 'string.quoted.double.yaml']),
  rule('YAML anchor', c.gold, ['entity.name.type.anchor.yaml', 'variable.other.alias.yaml']),
  rule('YAML directive', c.violet, ['keyword.other.directive.yaml', 'entity.other.document.begin.yaml']),

  rule('HTML tag', c.variable, ['entity.name.tag.html', 'entity.name.tag.structure.any.html']),
  rule('HTML attribute', c.number, ['entity.other.attribute-name.html']),
  rule('HTML attribute value', c.string, ['string.quoted.double.html', 'string.quoted.single.html']),
  rule('HTML doctype', c.dim, ['meta.tag.sgml.doctype.html', 'entity.name.tag.doctype.html']),


  rule('CSS selector element', c.variable, ['entity.name.tag.css']),
  rule('CSS selector class', c.type, ['entity.other.attribute-name.class.css']),
  rule('CSS selector id', c.function, ['entity.other.attribute-name.id.css']),
  rule('CSS pseudo', c.keyword, ['entity.other.attribute-name.pseudo-class.css', 'entity.other.attribute-name.pseudo-element.css']),
  rule('CSS property', c.punctuation, ['support.type.property-name.css']),
  rule('CSS value keyword', c.number, ['support.constant.property-value.css', 'keyword.other.unit.css']),
  rule('CSS at-rule', c.keyword, ['keyword.control.at-rule.css', 'punctuation.definition.keyword.css']),
  rule('CSS variable', c.variable, ['variable.argument.css', 'support.type.custom-property.name.css']),
  rule('CSS attribute selector', c.type, ['entity.other.attribute-name.css', 'entity.other.namespace-prefix.css']),
  rule('CSS literal value', c.number, [
    'constant.other.color.rgb-value.hex.css', 'constant.other.unicode-range.css',
    'entity.other.keyframe-offset',
  ]),

  rule('JSX tag', c.variable, ['entity.name.tag.js.jsx', 'entity.name.tag.tsx', 'support.class.component']),
  rule('JSX component', c.type, ['support.class.component.tsx', 'support.class.component.jsx']),
  // The grammar also emits `.directive.tsx` and `.namespace.tsx`, so the selector stops
  // at `attribute-name`. The CSS rules above are more specific and keep their own colour.
  rule('JSX attribute', c.number, ['entity.other.attribute-name']),
  rule('JSX expression braces', c.operator, ['punctuation.section.embedded.begin.tsx', 'punctuation.section.embedded.end.tsx', 'punctuation.section.embedded.begin.jsx', 'punctuation.section.embedded.end.jsx']),

  rule('Diff inserted', c.green, ['markup.inserted.diff', 'punctuation.definition.inserted.diff']),
  rule('Diff deleted', c.coral, ['markup.deleted.diff', 'punctuation.definition.deleted.diff']),
  rule('Diff header', c.gold, ['meta.diff.header', 'meta.diff.range']),
];

export const semanticTokenColors: Record<string, string> = {
  variable: c.variable,
  'variable.readonly': c.number,
  'variable.defaultLibrary': c.number,
  parameter: c.variable,
  property: c.variable,
  'property.readonly': c.number,
  'property.static': c.number,
  enumMember: c.number,
  class: c.type,
  'class.defaultLibrary': c.type,
  interface: c.type,
  struct: c.type,
  enum: c.type,
  type: c.type,
  typeParameter: c.type,
  namespace: c.type,
  function: c.function,
  'function.defaultLibrary': c.function,
  method: c.function,
  macro: c.function,
  keyword: c.keyword,
  modifier: c.keyword,
  operator: c.operator,
  string: c.string,
  number: c.number,
  regexp: c.string,
  comment: c.comment,
  decorator: c.gold,
  event: c.number,
  label: c.gold,
  selfParameter: c.keyword,
  builtinConstant: c.number,
};
