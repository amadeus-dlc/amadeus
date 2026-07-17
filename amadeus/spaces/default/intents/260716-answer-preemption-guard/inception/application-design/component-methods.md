# Component Methods — answer-preemption-guard

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜7)、codekb `architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`(変更 0 件)。

## C-1: amadeus-sensor-answer-evidence.ts

| 関数 | シグネチャ | 責務 |
|------|-----------|------|
| `main` | `(argv: string[]) => void`(export、in-process seam) | 引数 parse(--stage/--output-path 必須、**CLI 引数不備のみ** 前例 :112 に倣い exit 1 — AC-1e)→ evaluate → stdout JSON。**対象ファイル不在は exit 1 にしない** — 述語の no-file→pass に委譲(existsSync+fail の二重ゲートを作らない、AC-1c の無改修写像。m-4 是正)|
| `evaluateAnswerEvidence` | `(outputPath: string) => Result`(export、純関数) | (1) basename が `*-questions.md` でなければ skip pass(AC-1d) (2) intent dir 日付 < cutoff なら pass(AC-2a/2c、parse NaN も pass) (3) `checkQuestionsEvidence(outputPath)` を呼び kind/reason を写像(AC-1c) |
| Result 型 | `{ pass: boolean; findings_count: number; reason: string; skipped: "not-questions" \| "pre-cutoff" \| null }` | dispatcher 契約(pass/findings_count 必須)+診断フィールド。全フィールドが stdout JSON として dispatcher/finding に消費される(AC-1f 類推 — 検証劇場なし) |

- cutoff 判定は `QUESTIONS_EVIDENCE_CUTOFF_YYMMDD`(C-3)を import。日付の数値変換(先頭6桁 slice→parseInt)は gate-start :1722 と同一だが、**intent dir 名の取得経路は異なる**: gate-start は状態解決(recordDir = active-intent カーソル+intents.json、amadeus-lib.ts:1086)、sensor は outputPath 文字列中の `intents/<dir>/` セグメント直接パース(状態非参照 — 任意パスの手動 fire でも動く)。この経路差は実装時に導出関数の docstring へ明記する(m-1 是正)。
- CLI エントリは `import.meta.main` ガード(既存 script :229-232 前例)。

## C-3: cutoff canonical 化

- `amadeus-lib.ts`: `export const QUESTIONS_EVIDENCE_CUTOFF_YYMMDD = 260716;` を checkQuestionsEvidence 直上へ(意味論の同居)。
- `amadeus-state.ts:1721`: ローカル `const GUARD_CUTOFF_YYMMDD = 260716` を削除し lib import へ置換(挙動不変 — 値同一)。
