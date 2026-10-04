# Bible Quiz — Design (Opus 5.5 design decisions)

Static site (vanilla HTML/CSS/JS, no build) hosted on GitHub Pages. Bank: `data/questions.json`.

## Grading
Reveal the answer, then self-grade: **Got it / Partly (0.5) / Missed**. An optional typed answer is saved and shown next to the real answer but never auto-graded (questions are multi-part and paraphrase-heavy).

## Selection
- Default: 10 questions uniformly at random (Fisher-Yates), no repeats within a quiz.
- Opt-in **Focus mode**: weights unseen 3 / last Missed 4 / last Partly 2 / else 1, sampled without replacement (Efraimidis-Spirakis).
- Filters: testament, originals only. Retry-missed and missed-list quizzes. Injectable rng for tests.

## Originals marker
Items with `original: true` always show `*` (quiz, results, history, missed list) plus screen-reader text ("from your diagnostic test").

## Phrasing
`render.js` has one `PATTERN_FORMAT` map; it adds "Where do you find:" to where-find items only when the text lacks it. Unknown patterns are shown as-is.

## Persistence (localStorage)
`bq:v1:settings`, `bq:v1:current` (resume), `bq:v1:history` (newest first, cap 200, stores question ids only), `bq:v1:stats` (rebuildable from history). Export/import JSON. Stats: accuracy by category, pattern, testament; originals separately; rows with <3 attempts hidden.

## Files
`index.html`, `css/styles.css`, `js/{app,quiz,store,render}.js`, `tests/` (in-browser runner + bank validation), `.nojekyll`. Load the bank via relative `data/questions.json` (absolute `/data/...` 404s on a GitHub Pages project site). Local dev: `python3 -m http.server`. Deploy from main/root; `?v=N` cache-busting on CSS/JS.

## Validation
Bank must contain exactly 100 `original: true` items; pattern ids in `PATTERN_FORMAT` must match `questions.json`.
