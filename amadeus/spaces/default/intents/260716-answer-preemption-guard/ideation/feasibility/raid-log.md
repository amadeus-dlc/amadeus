# RAID Log — answer-preemption-guard

上流入力(consumes 全数): `../intent-capture/intent-statement.md`。

## Risks

- R1: stage frontmatter への sensors 宣言追加が全32ステージ×複数ハーネス dist に波及し diff が肥大 — 緩和: 宣言対象を questions を produce するステージに限定するか、matches glob で選別(設計で確定)。
- R2: cutoff 定数が gate-start(amadeus-state.ts)と sensor 実装の2箇所に複製されると drift する — 緩和: 定数を amadeus-lib.ts へ移設し両所から import(canonical 1定義 — construction ガードレール)。

## Assumptions

- A1: sensor の発火タイミング(PostToolUse hook が sensors_applicable を読む)は questions ファイル書込み時にも到達する — 設計段で hook の matches 経路を実測確認(external-seam-vocab-measurement: 存在実測と語彙実測の区別)。

## Issues

- I1: なし(前 intent RAID の引き継ぎ対象なし — eoc1-gate-check の残存フォローは walking-skeleton ユーザー確認のみで本 intent 無関係、2026-07-16 台帳実測)。

## Dependencies

- D1: `checkQuestionsEvidence`(amadeus-lib.ts:1173、マージ済み)— 実測確認済み。
- D2: sensor ディスパッチ機構(amadeus-sensor.ts)— 実測確認済み(fire <id> --stage --output-path)。
