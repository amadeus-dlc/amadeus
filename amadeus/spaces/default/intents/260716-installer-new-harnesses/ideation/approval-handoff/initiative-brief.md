# Initiative Brief — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../market-research/competitive-analysis.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`、`../team-formation/team-assessment.md`、`../rough-mockups/wireframes.md`、`../feasibility/raid-log.md`(R-1〜R-3)。

## 承認対象の要約

installer(packages/setup)のハーネス閉じ列挙を 4→6 値化し、`install --harness opencode|cursor` を有効化。列挙全数性・npm pack 実検証・将来条件をテスト可能に固定(C-5)。単一 Bolt(S)・直列1 builder・既存 CLI 文法保存。

## リスクと緩和(c1 — 代替緩和策込み)

| リスク | 一次緩和 | 代替緩和 |
| --- | --- | --- |
| R-1 並行 intent との installer 交差 | 着手前の実 diff 目録判定(c6) | 交差発生時は直列化(先着 PR 待ち)へ切替 |
| R-2 ローカル coverage 間欠 FAIL(#1085) | 静穏時実行+実文帰属 | CI(green 基準)を正とし、ローカル赤は rerun-red-reattribution で切り分け |
| R-3 全数性テストの共変偽 green | t149 同型(定数表・manifest 非導出)を requirements で固定 | レビュー観点に「導出元の独立性」を明示(検証劇場チェック) |

## ハンドオフ後の行程

Inception(RE diff-refresh → requirements — pre-declared 分岐1点の選挙含む → 設計)→ Construction(単一 Bolt)→ PR → マージ伺い。

## 承認により確定する事項

In/Out(scope-document)・体制(team-assessment)・出力契約(wireframes)— 以降の変更は仕様変更としてエスカレーション(正準リスト(4))。
