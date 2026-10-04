const PATTERN_FORMAT = { where_do_you_find: q => (/where do you find/i.test(q) ? q : `Where do you find: ${q}?`) };

export function formatQuestion(q) {
  const f = PATTERN_FORMAT[q.pattern];
  if (f) return f(q.question);
  if (/where.*find|locate/.test(q.pattern || '') && !/where do you find/i.test(q.question))
    return `Where do you find: ${q.question.replace(/[?.]$/, '')}?`;
  return q.question;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Asterisk (plus screen-reader text) for questions from the original diagnostic test.
export const star = q => q.original ? '<span class="ast" aria-hidden="true">*</span><span class="sr"> (from your diagnostic test)</span>' : '';

export const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
