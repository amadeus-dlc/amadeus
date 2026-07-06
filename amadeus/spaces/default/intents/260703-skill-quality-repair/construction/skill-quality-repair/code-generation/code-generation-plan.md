# コード生成計画 — unit: skill-quality-repair

上流入力は functional-design 成果物（business-logic-model.md の WF1〜WF5、business-rules.md、domain-entities.md）と requirements.md（R001〜R006、N001〜N004）である。
Test Strategy は Minimal（要求駆動。検証は決定論的検査と既存検証入口で行う）。
実行単位は単一 Bolt / 1 PR（functional-design-questions.md Q4=A）である。

## トレーサビリティ

| Step | 対応 WF | 対応要求 |
|---|---|---|
| Step 1 | WF1 監査 | R001 |
| Step 2 | WF5 #341 判定 | R006 |
| Step 3 | WF3 Grilling 規約 | R004 |
| Step 4 | WF4 入力契約＋決定論的検査 | R005 |
| Step 5 | WF2 補修 | R002、R003 |
| Step 6 | 昇格同期 | N003 |
| Step 7 | 検証 | N001、N002、N004 |
| Step 8 | code-summary | （stage 成果物契約） |

## 実行ステップ

- [x] **Step 1: WF1 監査（R001）** — `skills/amadeus*/` 全 41 skill を列挙し、`skills/amadeus/references/stage-catalog.md` を正としてステージ skill と非ステージ skill に分類する。各 skill を 4 観点（description/trigger 品質、構造分割、言語 policy 適合、コマンド・パスの実行可能性）で判定し、`construction/skill-quality-repair/audit-report.md` に skill × 観点の判定表（pass / fail / n-a / 未確認）と finding の 3 分類（`repairable` / `parity-limited` / `deferred`）を記録する。#340 向け要約コメント文も同ファイルに含める。
- [x] **Step 2: WF5 #341 disposition（R006）** — Step 1 の言語 policy 観点の判定結果から、残日本語 skill の policy 違反／許容を判定し、audit-report.md に #341 の disposition（close 提案または継続提案）と根拠を記録する。全面英語化の実施作業そのものは行わない（requirements 対象外）。
- [x] **Step 3: WF3 Grilling Decision Trail 規約（R004）** — `AmadeusValidator` の検査コードから `grillings.md` 必須列と session ファイル必須項目を抽出し、`skills/amadeus-grilling/references/` に生成規約＋コピー用テンプレートを 1 箇所定義する。Grilling Decision Trail を生成する skill から規約への参照を結線する（ステージ skill 側は grilling 結線の範囲内に限定）。
- [x] **Step 4: WF4 入力契約＋決定論的検査（R005）** — GitHub Issue を入力に取る公開 skill を特定し、入力契約（`#nnn` ≡ URL 等価、`owner/repo#nnn` 受理、文脈曖昧時停止）を追記する。TDD で進める: 先に決定論的検査スクリプト（Bun + TypeScript、対象 skill の SKILL.md に入力契約記載が存在することを検査）を書いて失敗を確認し、契約追記で pass させる。npm script として短い名前の検証入口を追加し、references に検証手順を記載する。
- [x] **Step 5: WF2 補修（R002、R003）** — Step 1 の `repairable`（非ステージ skill）と `parity-limited`（改名・grilling 結線内）の finding を source（`skills/amadeus*/`）で修正する。`deferred` は修正せず audit-report.md に後続 Issue 候補として記録する。
- [x] **Step 6: 昇格同期（N003）** — 変更した全 skill を `bun run dev-scripts/promote-skill.ts <skill> --replace` で昇格し、`npm run test:it:promote-skill` を実行する。`.agents/skills/amadeus-*` は直接編集しない。
- [x] **Step 7: 検証（N001、N002、N004）** — `npm run parity:check`（パリティ維持）、`npm run test:all`（標準検証）、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-skill-quality-repair`（成果物構造）を実行し、すべて pass を確認する。fail した場合は原因を修正して再実行する。
- [x] **Step 8: code-summary 作成** — 変更ファイル一覧、主要判断、検証結果、計画からの逸脱を `construction/skill-quality-repair/code-generation/code-summary.md` に記録する。

## テスト方針（Minimal）

- 新規スクリプト（Step 4 の決定論的検査）は dev-scripts ルールに従い TDD（RED → GREEN）で作る。
- Grilling 規約（Step 3）の受け入れ検証「新規生成 trail が validator を pass する」は build-and-test stage で実施する。
- リポジトリ全体の回帰は `npm run test:all` で検証する（本 repo の標準検証入口）。

## 制約（business-rules.md より）

- ステージ skill への変更は改名・grilling 結線の範囲だけ。逸脱が必要な finding は `deferred` として記録する。
- 昇格は必ず promote-skill.ts 経由。
- PR は 1 個、skill 変更（source と昇格先の同期を含む）だけで構成する。
- 不明な値は `未確認` と記録する。
