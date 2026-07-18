# フェーズ境界検証 — inception(test-pyramid-rebuild、#684)

上流入力(consumes 全数): requirements-analysis/requirements.md, application-design/{components,decisions}.md, units-generation/{unit-of-work,unit-of-work-dependency}.md, delivery-planning/bolt-plan.md, ideation(scope-document.md, feasibility-assessment.md, intent-statement.md)

inception → construction のフェーズ境界トレーサビリティ検証(governance protocol)。本 intent は**設計・計画・台帳 materialize まで**(FR-7、実装 Out)。

## ステージ完了状況(amadeus-state.md 実測)

| ステージ | 状態 | ゲート |
| --- | --- | --- |
| requirements-analysis | [x] EXECUTE | GATE_APPROVED(grant 経路、§13 E-TPR-RA2 0件成立) |
| application-design | [x] EXECUTE | GATE_APPROVED(grant dc2da4b5、§13 E-TPR-AD2 0件成立、diary 条件充足) |
| units-generation | [x] EXECUTE | GATE_APPROVED(grant dc2da4b5、§13 E-TPR-UG 0件成立、#1158 N1/N2 是正後 reviewer READY) |
| delivery-planning | 進行中(本ステージ) | E-TPR-DP 選挙後 approve、本 phase-check が approve 前提 |

## トレーサビリティ(要件 → 設計 → ユニット → Bolt)

| 要件(FR) | application-design | units-generation | Bolt |
| --- | --- | --- | --- |
| FR-1 サイズ分類台帳 | C1 SizeLedger | U1-size-ledger | Bolt 1 |
| FR-2 比率ガイドライン目標(50/45/5) | ADR-02、C2 | U2 | Bolt 2 |
| FR-3 tier×size 規約+tier-aware ゲート設計 | ADR-01/05、C2/C3 | U2 | Bolt 2 |
| FR-4 移設選定台帳(seam 化優先) | ADR-03、C4 | U3-migration-coverage | Bolt 3 |
| FR-5 実行時間予算(層別、値は U2 選挙) | ADR-02、C2 | U2 | Bolt 2 |
| FR-6 #683 層別カバレッジ整合 | C5 | U3 | Bolt 3 |
| FR-7 スコープ外・グリーン維持 | 全 ADR の Out 明記 | 全ユニット Out 明記 | 全 Bolt 再掲 |

- **上流遡及**: 全 FR は ideation(scope-document.md In-Scope 1〜4、feasibility-assessment.md、intent-statement.md)まで遡れる。FR-5(実行時間予算)は scope-document In-Scope 2 の回復として requirements で明示化(E-TPR-RA レビュー Critical 是正、leader「既決の執行」裁定)。
- **選挙裁定の反映**: E-TPR-RA(Q1-Q4)・E-TPR-AD(Q1=B/Q2=B/Q3-5=A、留保2件転記)・E-TPR-DP(進行中)。設計判断はすべて blind 選挙で確定、単独決定なし。

## 無申告逸脱の不在(P3)

- application-design reviewer(READY GoA 2): 引用ズレ9件是正のみ、スコープ Out 一貫、後方互換シム混入なし(ADR-05 非破壊温存)。
- units-generation reviewer(READY GoA 1、2巡): #1158 N1/N2(規模行数化)是正、N3(adapter 先行着地禁止)充足、写像漏れなし。
- 無申告の要件・設計逸脱は各 reviewer 観点で検査済み、検出ゼロ。

## 検証劇場の不在(P2)

- 全数値(440/163/FS153/spawn99/50-45-5)は RE 実測(observed `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)からの転記。ハードコードなし。
- classifyTestSize を size の単一真実源に固定(ADR-04)、分類経路の二重化禁止(Q1 e4 留保)。
- 全ステージで宣言センサー(required-sections/upstream-coverage/answer-evidence)全 PASSED、FAILED 0(audit 実測)。

## 判定

inception フェーズのトレーサビリティ・ゲート承認・逸脱不在・検証劇場不在をすべて確認。delivery-planning の E-TPR-DP 選挙成立と本ステージ approve をもって inception 完了、construction 進入可。construction 進入前に `amadeus-runtime.ts compile` で bolt_dag 鮮度を再確認する(recompile-before-construction-bolt-dag)。
