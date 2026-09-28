import { contrastEmitted, covered, orderStack, RENDER_ORDER, stackBackground as nativeBackground } from '@sltsh/aion-tokens';
import type { Oklch, StackLayer, StateSource, SyntaxRole } from '@sltsh/aion-tokens';
export const TOOLBAR: readonly StackLayer[] = ['lineHighlight', 'selection', 'wordHighlight', 'findMatchOther', 'addedLine', 'addedWord', 'removedLine', 'removedWord'];
export type ContentKey = 'currentSelection' | 'diffSides' | 'outsideCoverage';
export function toggle(on: ReadonlySet<StackLayer>, layer: StackLayer): Set<StackLayer> {
  const next = new Set(on);
  if (next.has(layer)) {
    next.delete(layer);
    if (layer === 'addedLine') next.delete('addedWord');
    if (layer === 'removedLine') next.delete('removedWord');
  } else {
    next.add(layer);
    if (layer === 'addedWord') next.add('addedLine');
    if (layer === 'removedWord') next.add('removedLine');
  }
  return next;
}
export const enabled = (on: ReadonlySet<StackLayer>, layer: StackLayer): boolean => covered(toggle(on, layer));
export function disabledReason(on: ReadonlySet<StackLayer>, layer: StackLayer): ContentKey | null {
  if (enabled(on, layer)) return null;
  const next = toggle(on, layer);
  if (next.has('lineHighlight') && next.has('selection')) return 'currentSelection';
  if (next.has('addedLine') && next.has('removedLine')) return 'diffSides';
  return 'outsideCoverage';
}
export function stackBackground(source: StateSource, on: ReadonlySet<StackLayer>): Oklch {
  return nativeBackground(source, source.neutral.editor, orderStack(on));
}
export const toolbarOrder = TOOLBAR.filter(layer => RENDER_ORDER.includes(layer));

export const STATE_ROLES = ['comment', 'keyword', 'variable', 'operator', 'punctuation', 'function'] as const;
export function stateRatios(source: StateSource, background = source.neutral.editor): readonly { role: typeof STATE_ROLES[number]; ratio: number }[] {
  return STATE_ROLES.map(role => ({ role, ratio: contrastEmitted(role === 'comment' ? source.comment : role === 'punctuation' ? source.neutral.textSecondary : source.syntax[role as SyntaxRole], background) }));
}
