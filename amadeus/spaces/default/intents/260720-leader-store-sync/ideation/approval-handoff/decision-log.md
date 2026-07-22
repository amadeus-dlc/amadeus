# Decision Log — 260720-leader-store-sync(ideation)

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、scope-document.md、constraint-register.md、raid-log.md、intent-backlog.md

## 決定一覧

| # | 決定 | 根拠 | 出典 |
| --- | --- | --- | --- |
| D-1 | 方式 A/B/C の確定は requirements 選挙(本フェーズで先取りしない) | leader ディスパッチ (3) | intent-statement 前提節・E-OC1(IC Q3、02:49:41Z) |
| D-2 | 方式 B は本 intent スコープ外条件付き(採用時は別 Issue 委譲) | C-7(e2/e4 管轄面) | feasibility Q1(E-OC1 02:54:35Z)・scope W-2 |
| D-3 | Must は効力条件(裁定従属)付きで定義し、非採用分岐は Won't 編入 | ruling-dependent-placeholder | scope Q1(E-OC1 03:05:07Z) |
| D-4 | 境界1基準 =「leader 所有物の main への運搬か」 | 既習様式踏襲 | scope Q2(同上) |
| D-5 | 抽出述語は決定的関数(elections/ 全量+clone-id→auditShardName)で書く | R-1 緩和・deterministic-function-direct-sweep | feasibility seam 実測 1 |

## 未決(inception へ)

- 方式 A/C(併用含む)の確定・同期契機の定義(N 選挙/PM 毎等)・生成 PR の分割条件 — requirements 選挙。
