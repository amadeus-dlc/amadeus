# Initiative Brief — eoc1-gate-check(Issue #1101)

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../feasibility/raid-log.md`、`../rough-mockups/wireframes.md`(出力契約)、`../scope-definition/intent-backlog.md`、`../market-research/competitive-analysis.md`(blocking 択)、`../feasibility/feasibility-assessment.md`(実測5点)、`../feasibility/constraint-register.md`(C-1〜C-5)、`../team-formation/team-assessment.md`(編成)、`../feasibility/constraint-register.md`(C-1〜C-5)。

## 承認対象

E-OC1 機械検査(gate-start 含意形述語)の Construction 移行 — E-PM6 L1 裁定(ユーザー承認済み norm PR #1102)の執行 intent。

## リスクと緩和策(c1 — 併示)

| リスク | 緩和策 |
|--------|--------|
| 偽陽性拒否(正常フロー停止) | 含意形述語+落ちる実証3系目(正常系非拒否テスト)— requirements で AC 固定 |
| 旧 record への遡及不適合 | gate-start 時のみ発火(過去 approve 済みへ遡及しない)— requirements で明文化 |
| #922 との二重実装 | 検査述語の共有関数化(scope In 5)— sensor 発火点は #922 側 |

## ハンドオフ

conductor/builder = e4(継続)。Construction は単一 Bolt 想定(units-generation で確定)。
