---
name: post-validation
description: Use this skill after content import to validate and correct imported pages. Takes one or more page URLs (or content paths) as input, runs the post-process.js pipeline on each, verifies every correction step applied cleanly, cross-checks footnote CIDs against the footnotes sheet, and reports a deduplicated list of missing footnotes plus a final per-page import status. Triggers on "post-validation", "validate import", "post process pages", "run post-process", "check imported pages", "missing footnotes", "footnote validation", "final import status".
version: 1.0.0
---

# Post-Import Validation

Takes a set of imported pages, runs the `tools/importer/post-process.js` correction
pipeline on each, validates that every correction step applied cleanly, and reports:

1. A **deduplicated list of missing footnote CIDs** (ready to paste into the footnotes sheet)
2. A **final per-page import status** (post-process result + validation checks)

This skill operates on **already-imported** `content/**/*.plain.html` files. It does
NOT import pages — import is handled by the `import-page` skill / content-import flow.

---

## Input

The user provides one or more **page URLs** or **content paths**, e.g.:
- `https://main--wellsfargo--mkbansal1.aem.live/mortgage`
- `https://www.wellsfargo.com/es/about/inclusion/`
- `/mortgage/buying-a-house`
- `content/mortgage.plain.html`

Resolve each input to a local content file:

| Input form | Local file |
|---|---|
| Full EDS/prod URL | strip origin + trailing slash, prefix `content/`, suffix `.plain.html` |
| Path `/mortgage/buying-a-house` | `content/mortgage/buying-a-house.plain.html` |
| Already a `content/...plain.html` path | use as-is |

Homepage `/` maps to `content/index.plain.html`.

```bash
# Resolve a path -> file and confirm it exists
f="content/${PATH#/}.plain.html"; test -f "$f" && echo "OK $f" || echo "MISSING $f"
```

If a file does not exist locally, report it as `NOT_IMPORTED` and skip it (do not
attempt to import — tell the user to import it first with the import flow).

---

## Workflow

Run these steps for the full set of files. Use a TodoWrite list to track per-page progress.

### Step 1 — Snapshot before state

For each resolved file, capture a quick "before" fingerprint so corrections are visible:

```bash
for f in <files>; do
  echo "=== $f ==="
  wc -l "$f"
  grep -c 'tcm:' "$f" || true
done
```

### Step 2 — Run the post-process pipeline

Run `post-process.js` on all files in one invocation. It edits files **in place** and
performs every correction step (footnote ref normalization, absolute→relative links,
trailing-slash removal, hero/learning-nav/tabs serialization fixes, section-metadata
generation, `<ol>`→`<p>` footnote flattening, pageid-out-of-footnotes guard, div balance).

```bash
node tools/importer/post-process.js <file1.plain.html> <file2.plain.html> ...
```

The script prints `✅ <path>` per file. A non-zero exit or a missing `✅` line means
that file failed — record it as `POST_PROCESS_FAILED`.

> Why the script (not manual steps)? It is deterministic, idempotent, and faster than
> re-applying each correction by hand. It is safe to run repeatedly. The skill's job is
> to run it and then VALIDATE that the output is clean.

### Step 3 — Validate each correction step applied cleanly

After post-processing, run these checks per file. Any hit is a defect to investigate
(the pipeline normally clears all of them; a hit means the page has a structure the
pipeline didn't cover and may need a manual fix or a pipeline enhancement).

```bash
for f in <files>; do
  echo "=== $f ==="
  # a. Footnote refs must be <sup><a ...>N</a></sup> — never reversed, never bare modal text
  grep -o '<a[^>]*tcm:[^>]*><sup>' "$f" | head && echo "  ! anchor-wraps-sup (should be sup-wraps-anchor)"
  grep -c 'Opens a modal dialog' "$f" | grep -qv '^0$' && echo "  ! leftover modal-dialog text"
  # b. No absolute wellsfargo.com links remain (should be relative)
  grep -c 'https://www.wellsfargo.com/' "$f" | grep -qv '^0$' && echo "  ! absolute wellsfargo.com link"
  # c. No internal trailing slash (path, ?query, or #hash)
  grep -oE 'href="/[^"]+/("|/?[?#])' "$f" | head && echo "  ! internal trailing slash"
  # d. pageid must NOT appear in the footnotes field
  grep -oE 'footnotes</p></div><div><p>[^<]*' "$f" | grep -oE '(DT1|DT2|QSR|LRC|PM)-[0-9-]+' && echo "  ! pageid in footnotes list"
  # e. No footnote <ol> ordered lists
  grep -o '<ol>[^<]*<li>[^<]*tcm:' "$f" && echo "  ! footnote ordered-list not flattened"
  # f. Div balance per line
  awk '{o=gsub(/<div/,"&"); c=gsub(/<\/div>/,"&"); if(o!=c) print "  ! line "NR" div imbalance ("o" open / "c" close)"}' "$f"
done
```

Record which checks passed for each file. A file with zero hits is `CLEAN`.

### Step 4 — Footnote cross-check (missing footnotes report)

Run the footnote checker on all files. It extracts every footnote CID from both the
body links and the Metadata `footnotes` field, picks the right sheet (`es` for `/es/`
paths, otherwise `en`), cross-checks against the **live footnotes sheet**, and prints a
**deduplicated** table of CIDs that are NOT in the sheet.

```bash
node .claude/skills/post-validation/scripts/check-footnotes.mjs <file1> <file2> ... \
  [--base=https://main--wellsfargo--mkbansal1.aem.live]
```

- Default base is the production EDS preview. Pass `--base` to point at a feature branch.
- Add `--json` for machine-readable output (used when chaining batches).
- pageid CIDs (`DT1/DT2/QSR/LRC/PM-…`) are automatically excluded.

The missing-CID table is already deduplicated across all input pages, so the user can
paste it straight into the footnotes sheet. Each row also shows which page(s) reference
it and which sheet (en/es) it belongs in.

### Step 5 — Present final status

Show two outputs (see formats below). Do not just print file paths — present the tables
directly in the conversation.

---

## Output 1 — Final import status (per page)

| Page | Post-process | Validation | Footnotes (total / missing) |
|------|--------------|------------|------------------------------|
| /mortgage | ✅ | CLEAN | 10 / 1 |
| /es/about/inclusion | ✅ | CLEAN | 1 / 0 |
| /some/page | ⚠ NOT_IMPORTED | — | — |

Statuses:
- **Post-process**: `✅` (ran), `POST_PROCESS_FAILED`, `NOT_IMPORTED` (no local file)
- **Validation**: `CLEAN` (no Step 3 hits) or a short list of the checks that flagged
- **Footnotes**: total referenced CIDs / count missing from the sheet

## Output 2 — Missing footnotes (paste into sheet)

Present the deduplicated table from Step 4 verbatim:

```
**Missing Footnote CIDs (not in /data/footnotes.json):**

| cid | sheet | Referenced on page(s) |
|-----|-------|----------------------|
| tcm:84-302220-16 | en | /mortgage |
```

If none are missing, state: **"All footnote CIDs are present in footnotes.json."**

---

## Notes

- The pipeline is idempotent — re-running on an already-clean file is safe and a no-op
  for content.
- Footnote **body text is never in page content** — only CIDs. The missing-footnotes
  report tells the author which CIDs to add to `/data/footnotes.json`; this skill does
  not author the footnote text (the author supplies the verbatim source text).
- For large batches, split the file list and run Step 2 + Step 4 per batch, then merge
  the missing-CID tables (dedupe again across batches).

## Related

- **import-page** — imports a page and documents the post-process steps this skill validates
- **eds-content-validator** — broader content-parity audit against production
