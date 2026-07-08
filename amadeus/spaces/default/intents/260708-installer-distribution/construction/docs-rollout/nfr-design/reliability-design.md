# Reliability Design — docs-rollout

> ステージ: nfr-design (3.3) / Unit: docs-rollout / 作成: 2026-07-08
> 出典: `../nfr-requirements/reliability-requirements.md`(REL-D01〜D03)・`tech-stack-decisions.md`、`../functional-design/business-logic-model.md`(PR 構成)

## REL-D01(相補2機構)の実装構造

- PR のコミット構成で保証する: バンプ+CHANGELOG+バッジ+dist 再生成+promote:self を**同一コミット**に含める(business-logic-model のワークフロー順序)。CI の既存5ゲート(typecheck/lint/dist:check/promote:self:check/tests)が通ることが完了条件の機械面

## REL-D02(grep チェックリスト)の実装構造

- PR 説明文のテンプレートにチェックリスト3項目(cp -r 主経路の不在/5要素言及の存在/掲載コマンドの契約一致)を記載する(レビュアーが PR 上でチェック可能な形 — 機械化はしない判断を維持)

## REL-D03(タグ連鎖)の実装構造

- 追加構造なし(U4 手順書章立て1が防波堤 — 責務の重複を作らない判断を維持)
