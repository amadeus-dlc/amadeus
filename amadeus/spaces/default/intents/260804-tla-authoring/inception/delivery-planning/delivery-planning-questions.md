# Delivery Planning Questions: TLA+ Model Authoring

## 回答方法

- モード: Guide me（人間回答、audit 記録）
- 人間承認: 2026-08-04T17:23:30Z（Q1〜Q3 全問を Guide me バッチ 1 で人間が回答）
- 質問予算: 最大 8 件（Standard depth。follow-up 込み）。unit topology（`unit-of-work-dependency.md`）と team-practices（`memory/team.md` の parallel-bolts 既定、`memory/project.md` の walking-skeleton 規範）で確定済みの事項は再質問しない。
- 本 stage は Bolt 順序の経済判断のみを行う（topology は 2.7 で確定済み）。

### Q0. 回答モードの選択

- A. Guide me（対話で 1 問ずつ）
- B. Grill me（1 問ずつ深掘り、推奨回答付き）
- C. I'll edit the file（このファイルを直接編集）
- D. Chat（自由に議論して抽出）

[Answer]: A. Guide me

## 質問

### Q1. Bolt 順序のヒューリスティクをどれにしますか？

`memory/project.md` の walking-skeleton 規範（greenfield 要素を含む intent では最初の Bolt を小さな end-to-end スライスとし人間ゲートで確認）が適用されます — 本 intent は新規 evidence store・新 plugin tools という greenfield 要素を含みます。

- A. walking-skeleton-first + risk-first の hybrid（推奨）: Bolt 1 = U1 基盤の end-to-end スライス（identity→bundle build→verify→read の縦貫）。以降は risk-first — 最大リスク前提（§11a checkpoint の機械強制、model-map schema 互換）を持つ U2/U4 側を早期に着地させる
- B. value-first: 利用者価値（authoring 経路の完成 = U5）へ最短で向かう順序。リスク前提の検証が後ろへずれる
- C. 純粋 risk-first: walking skeleton を立てず、最初から U2（checkpoint 前提）へ突入。greenfield 規範に反するため要理由
- X. Other (please specify)

[Answer]: A. walking-skeleton-first + risk-first の hybrid（推奨）

- 人間回答: 2026-08-04T17:23:30Z（Guide me バッチ 1）

### Q2. Bolt 粒度と並行バッチ構成をどうしますか？

`unit-of-work-dependency.md` の並行機会（U6 は全独立、U1 後に U2 ∥ U3、U4 は U3 後）と `memory/team.md` の parallel-bolts 既定が前提です。

- A. 1 unit = 1 Bolt、並行バッチあり（推奨）: Bolt 1 = U1（walking skeleton、単独ゲート）→ Batch 2 = U2 ∥ U3 ∥ U6（並行）→ Bolt 4 = U4 → Bolt 5 = U5。計 5 Bolt/4 バッチ
- B. 1 unit = 1 Bolt、直列のみ: U1 → U2 → U3 → U4 → U6 → U5 の 6 Bolt 直列。並行の利得を捨てる
- C. 束ねる: U2+U3 を 1 Bolt に統合（判定と referee を同時着地）。Bolt 数は減るが 1 Bolt が肥大しレビュー面が粗くなる
- X. Other (please specify)

[Answer]: A. 1 unit = 1 Bolt、並行バッチあり（推奨）

- 人間回答: 2026-08-04T17:23:30Z（Guide me バッチ 1）

### Q3. 外部依存として管理すべき gated item はありますか？

本 intent はリポジトリ内で完結し、既知の候補は「CI 上の TLC 実行環境（既存 formal-model-check の Docker ベース model-check が workflow_dispatch 限定で運用されている）」のみです。U5 の E2E / build-and-test の受け入れ実測が CI の TLC 実行可否に依存する可能性があります。

- A. TLC 実行環境のみを gated item として記録（推奨）: owner = 本 intent、リードタイム = なし（既存資産）、ブロック対象 = U3 proof と U5 E2E、緩和 = ローカル TLC 実行での受け入れ + CI は既存 workflow_dispatch 経路を再利用
- B. 外部依存なしと記録: TLC は既存資産であり gated item に数えない
- X. Other (please specify)

[Answer]: A. TLC 実行環境のみを gated item として記録（推奨）

- 人間回答: 2026-08-04T17:23:30Z（Guide me バッチ 1）

## 上流トレーサビリティ

- `inception/units-generation/unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`
- `inception/application-design/components.md`、`inception/requirements-analysis/requirements.md`
- `ideation/`（team-formation は SKIP — 全 Bolt を amadeus-developer-agent が実行）
- team-practices: `memory/team.md`、`memory/project.md`（walking-skeleton 規範）、`memory/phases/inception.md`。`stories.md` / mockups は SKIP により存在しない
- `inception/requirements-analysis/requirements.md`（要求正本）、`inception/application-design/components.md`（設計正本）
