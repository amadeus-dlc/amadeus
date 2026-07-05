# Grilling Decision Trail Contract

This is the single source of the Grilling Decision Trail's generation format
(R004 / #405). `../SKILL.md` and `../../amadeus-validator/SKILL.md` both point
here instead of restating the required columns and fields — do not copy this
structure into another file. The required items below are extracted from
`../../amadeus-validator/validator/AmadeusValidator.ts` (`checkGrillings` and
its helpers); keep this file and that check code in agreement.

A Grilling Decision Trail is two artifacts placed together under the target
root (see `../SKILL.md` § "Grilling Decision Trail" for what a target root is
and when to create one):

```text
<target root>/
  grillings.md
  grillings/
    G001-<topic>.md
```

## `grillings.md` (index)

Exactly one `## 一覧` heading, holding one table with these columns, in this
order:

| ID | 主題 | 対象 | 状態 | 主な確定判断 | 反映先 | 詳細 |
|---|---|---|---|---|---|---|

- `ID`: `Gnnn` (e.g. `G001`), unique within the file.
- `主題`, `対象`, `主な確定判断`, `反映先`: not blank.
- `状態`: one of `active` / `completed` / `superseded`, and must match the
  `状態` recorded in that session's `概要` (see below).
- `反映先`: a relative link (or comma-separated links) to an artifact that
  exists inside the target root.
- `詳細`: a Markdown link to `grillings/<ID>-<topic>.md` (the session file
  for that row's `ID`).

## Session file (`grillings/Gxxx-<topic>.md`)

- File name: `Gnnn-<topic>.md`, where `<topic>` is lowercase letters, digits,
  and hyphens only (pattern `^G\d{3}-[a-z0-9]+(-[a-z0-9]+)*\.md$`).
- The file's first line (its title) includes the session ID (`Gnnn`).
- Exactly 3 headings, in this order: `## 概要`, `## 確定判断`, `## 質問記録`.

### `概要`

At least these labeled bullets:

- `- 状態: <active|completed|superseded>` — must match the index row's `状態`.
- `- 反映先: <link>` — not blank; must resolve to an artifact inside the
  target root (a relative link from `../SKILL.md`'s Event Storming exception,
  `../<id>.md`, is allowed there only).

### `確定判断`

One table with these columns:

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|

- `ID`: `GDnnn` (e.g. `GD001`), unique within the target root (across every
  session file under the same `grillings/`).
- `判断`, `反映先`: not blank. `反映先` must resolve to an artifact inside the
  target root.
- `状態`: `active` or `superseded`.
  - `active` rows leave `置き換え先` blank (no replacement).
  - `superseded` rows carry `置き換え先` naming at least one existing `GDnnn`
    in the same target root (comma-separated for more than one).

### `質問記録`

One `### Qnnn` heading per question (e.g. `### Q001`), each followed by these
labeled bullets:

- `- 確認したいこと: <text>`
- `- 確認が必要な理由: <text>`
- `- 推奨回答: <text>`
- `- 推奨理由: <text>`
- `- ユーザー回答: <text>`
- `- 確定判断: <GDnnn[, GDnnn...]>` — every referenced ID must exist in a
  `確定判断` table under the same `grillings/` (any session file of the same
  target root; IDs are unique across that root, so cross-session references
  are valid).

## Copy-paste template

Copy this into a new session file and fill every placeholder; do not leave a
placeholder unfilled and do not add fields beyond this shape.

```md
# G00X-<topic>

## 概要

- 状態: active
- 反映先: <relative link to the artifact this session reflects into>

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD00X | <the confirmed decision> | active | <relative link> | |

## 質問記録

### Q001

- 確認したいこと: <what you want to decide>
- 確認が必要な理由: <why this needs the human now>
- 推奨回答: <recommended answer>
- 推奨理由: <reason for the recommendation>
- ユーザー回答: <the human's answer>
- 確定判断: GD00X
```

Add the matching row to `grillings.md`'s `一覧` table in the same change:

```md
| G00X | <topic> | <target> | active | <the confirmed decision, short form> | <link to reflected artifact> | [G00X](grillings/G00X-<topic>.md) |
```

## Acceptance check

A Grilling Decision Trail generated from this contract passes
`AmadeusValidator` without hand-fixing, with no visual comparison against an
existing example needed (R004's acceptance condition).
