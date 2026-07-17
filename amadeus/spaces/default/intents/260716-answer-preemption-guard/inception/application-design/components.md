# Components — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜7)、codekb `architecture.md`・`component-inventory.md`、`../practices-discovery/team-practices.md`(変更 0 件)。

## コンポーネント一覧

| # | コンポーネント | 種別 | 正本パス | 規模見積 |
|---|---------------|------|---------|---------|
| C-1 | answer-evidence sensor script | 新規 TS | `packages/framework/core/tools/amadeus-sensor-answer-evidence.ts` | 〜120行(薄い adapter) |
| C-2 | answer-evidence manifest | 新規 md | `packages/framework/core/sensors/amadeus-answer-evidence.md` | 〜40行 |
| C-3 | cutoff 定数の canonical 化 | 既存2ファイル改修 | `amadeus-lib.ts`(export 追加)+`amadeus-state.ts`(ローカル定数 :1721 を import へ置換) | ±10行 |
| C-4 | stage frontmatter 宣言 | 既存32ファイル各+1行 | `.claude/amadeus-common/stages/*/*.md` の `sensors:` リスト | +32行(機械的) |
| C-5 | テスト | 新規 TS | `tests/integration/t-answer-evidence-sensor.test.ts` | 〜200行 |

## 再利用棚卸し(reuse inventory — inception ガードレール)

- 述語: `checkQuestionsEvidence`(amadeus-lib.ts:1173)— **無改修再利用**(C1)
- dispatcher: `amadeus-sensor.ts` — **無改修**(id-agnostic、:576/:693-699 の汎用読み)
- hook: `.claude/hooks/amadeus-sensor-fire.ts` — **無改修**(A1=YES)
- graph compile: `amadeus-graph.ts` — **無改修**(sensors: → sensors_applicable は id 非依存)
- テスト scaffold: `t-eoc1-gate-evidence.test.ts` の fixture 様式(scaffoldShared)を再利用

新規機構はゼロ — 既存インフラで代替できない要素は sensor script/manifest 本体のみ。
