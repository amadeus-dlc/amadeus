---
id: undefined-term
kind: deterministic
command: bun {{HARNESS_DIR}}/tools/amadeus-sensor-undefined-term.ts
default_severity: advisory
description: Advisory glossary-diff check — flags a candidate multi-word English term used in a Requirements Analysis question heading or option that resolves against no known definition source
category: governance
matches: "**/requirements-analysis/{requirements,requirements-analysis-questions}.md"
input_schema:
  output_path: string
  stage_slug: string
output_schema:
  pass: boolean
  findings_count: integer
  terms: string[]
timeout_seconds: 5
---

# undefined-term sensor

Advisory Write/Edit-time surface for Issue #2029: an agent can coin a
project-specific term and use it in a user-facing question or artifact
without defining it, and no existing sensor catches this. The reproduction
case (Issue #2018 / intent `260802-plugin-optin-parity`) is a real one —
the user asked `desired plugin setとは、どこかに用語定義ある？` because the
term was used undefined in a `requirements-analysis-questions.md` heading.

## Scope

Fires only on `requirements.md` and `requirements-analysis-questions.md`
under a `requirements-analysis` stage directory (the `matches` glob). The
stage's auto-maintained `memory.md` observation diary is out of scope.

## Extraction rule

From every `## `/`### ` heading line and every lettered option line
(`A. `, `B. `, ...) in the checked artifact: strip backtick code spans,
markdown link URLs, `#123` issue references, and `cid:...` citations, then
extract the maximal run of 2-5 space-separated ASCII words. A run
containing a `camelCase`/acronym-shaped token is discarded (reads as code
or a jargon acronym, not a coined term of art). A surviving candidate is
reported only when its normalized form occurs **2+ times** in the scanned
lines, **or** it is **3+ words long** — a one-off short phrase reads as
incidental description, not a deliberately introduced term.

**Known false negative, accepted by design**: a genuinely coined 2-word
term used only once (e.g. a real historical case, "Grill me", from intent
`260706-amadeus-grilling`) is not flagged. The gate exists specifically to
suppress a demonstrated false positive class (ordinary 2-word descriptive
English used once, e.g. "production toolchain" from intent
`260812-tla-proof-receipt`) at the cost of this narrower miss. See
`DESIGN-2029.md` §2.2 for the full analysis this trade was made against.

This mechanism only extracts Latin-script runs — a coined Japanese-native
term is out of scope (no deterministic word-boundary segmentation without a
tokenizer).

## Definition sources checked

1. The canonical glossary shipped with the framework —
   `<harness-dir>/knowledge/amadeus-shared/glossary.md` — parsed by its
   `| **Term** | Definition |` table rows. Always present.
2. Every `*.md` file directly under `amadeus/spaces/<active-space>/knowledge/amadeus-shared/`
   (same row shape), a project's own free-form working vocabulary. This
   directory or its files may be entirely absent in a fresh workspace — the
   sensor treats that as "no project terms," not a failure.
3. The checked artifact itself, and its sibling artifact in the same stage
   directory (`requirements.md` ↔ `requirements-analysis-questions.md`): any
   `| **Term** | Definition |` row, or a bolded term under a `## Terminology`
   / `## 用語` heading.

## Failure mode

When an unresolved candidate term is found, emits `SENSOR_FAILED` and
writes detail to
`amadeus-docs/.amadeus-sensors/<stage-slug>/undefined-term-<fire-id>.md`
(Fire id is the 8-hex correlator from the SENSOR_FIRED audit row) listing
the candidate terms. The verdict is advisory — the human decides at the
gate.
