export const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A copy block reaches the browser as an attribute value, so it also has to survive the
// quote that delimits it and the newlines that separate its rows.
export const escapeAttr = (value: string): string =>
  escapeHtml(value).replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
