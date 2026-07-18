# Intent Backlog — test-pyramid-rebuild(#684)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## 本 intent(In)

| # | アイテム | 出典 |
|---|---|---|
| B-1 | サイズ分類台帳(440ファイル、tier×size、計測導出) | Issue 実装スコープ1 |
| B-2 | 層責務+サイズ基準の文書化 | Issue 実装スコープ2 |
| B-3 | 比率目標+実行時間予算の設計(選挙で値確定) | Issue 実装スコープ2 |
| B-4 | サイズ違反の移設是正の Issue 分割計画 | Issue 実装スコープ3 |
| B-5 | #683 層別カバレッジ整合の計画 | Issue 実装スコープ4 |

## 明示的に先送り(Out — 別 intent 候補)

| # | アイテム | 理由 |
|---|---|---|
| O-1 | 実移設(unit medium 162件等の書き換え/移動) | グリーン退行リスク・大型のため別 intent(B-4 の計画に従って実施) |
| O-2 | run-tests.sh 実装再編 | 計画まで(B の再編計画)、実装は別 intent |
