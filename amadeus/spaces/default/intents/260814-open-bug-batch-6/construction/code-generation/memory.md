<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-15T (Interpretation): U-5 完了 — 仮説反証・機序は PR #2413 実装中 WIP バイトへ帰属(byte-level 再現)。ソース変更 0 件、PR #3080 は record checkpoint 配送。§12a は iteration 1 NOT-READY(パス宣言逸脱・自己参照述語)→ 是正 → iteration 2 READY(invocation 8d01449f)。
- 2026-08-15T (Deviation): unit-of-work.md の record 成果物パス宣言を engine 正準へ訂正(訂正注記付き)。CI acceptance 経路の残骸(repo 直下のモデル出力・docker 計測ファイル)を除去した。
- 2026-08-15T (Interpretation): U-1 完了 — 選挙裁定 A を TDD で実装(旧拒否3層の削除置換・センサー landed 検証・stage 契約改訂)。PR #3081。§12a iteration 1 NOT-READY(plan checkbox・(3)(4) 実測不在)→ 是正 → iteration 2 READY(PR head 実体で述語4本再検証)。
- 2026-08-15T (Interpretation): U-2 完了(PR #3086、READY iteration 1)。builder がセッション上限で停止したため conductor が完成・検証を直接実施。FOLLOW-UP 申し送り: 発火面(コンパイル解決 sensors_applicable)の実測は build-and-test で閉じる。テストの covers 行(plugin-compose 参照)は次回 push で是正。
- 2026-08-15T (Tradeoff): 並行 intent の連続着地で intents.json が繰り返し競合。各 bolt branch で「main 版+自エントリ」の集合再構成を機械化(reledger.py)し、3 PR を auto-merge(queue)へ投入(ユーザー承認: CI green でマージ可)。
- 2026-08-15T (Interpretation): U-4 完了(READY iteration 1、PR #3089)— 判定「覆う」を独立再実行で確認、是正0件、対称面8箇所は #3088 起票。FOLLOW-UP 申し送り: 述語2 の複数行呼出盲点(レビュアー指摘)は #3088 側の完了条件で拾う。
- 2026-08-15T (Interpretation): U-3 完了(PR #3092 queue 投入済み、head ad60b8afa)。§12a は i1 NOT-READY(size purity・registry 申告)→ i2 NOT-READY(新規ファイル逸脱)→ 選挙 E-260815-U3-NEWFILE-DEVIATION(A 2-0)+D-3 追補+observe-quality repair → 最終パス READY(invocation 29563cc5、iteration 2 として確定)。07-sensor-system の同類 drift は #3093 系として起票。
- 2026-08-15T (Deviation): PR queue 投入後はブランチ更新不可(GH006 実測)のため、summary provenance 是正と再 mint report は conductor record を正とし、最終 record checkpoint で本線へ届ける。
- 2026-08-15T (Deviation): U-3 の report 再 mint 後、CG ゲートの pr-convergence-report-format が deadend 化(merged 後は created の head 整合が不能・landed は pr-convergence ステージ限定)。created report(attest head=PR head ad60b8afa)を worktree(同 HEAD)で復元し stage=code-generation で発火して合格(created の拒否は pr-convergence ステージ限定という shipped 契約どおり)。landed report は pr-convergence ステージで正式に mint する。early-merge × 再 fire の CG ゲート隙間は追起票候補。
