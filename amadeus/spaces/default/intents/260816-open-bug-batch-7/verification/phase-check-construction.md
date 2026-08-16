# Phase Check — Construction → 完了(260816-open-bug-batch-7)

検証日時: 2026-08-16(formal-model-check ゲート前)。方法: 各ステージ成果物・PR・main 断面の実読/実測による照合(下表)。実測値の取得コマンドは各行に併記または一次記録(各 unit の code-summary / build-test-results.md / pr-convergence-report.md / stage diary)を指す。

## 検査結果

| 検査 | 結果 | 根拠 |
|---|---|---|
| FR → 実装の被覆 | PASS | FR 7 件が 3 unit で出荷済み。着地面 grep(main `2555e5b42` 断面): #3155 = `bootstrap-provenance` 参照 0 行・exit 1(tests/ scripts/ packages/)、#2363 = `promote-self.ts:75` に `{ src: "dist/pi/.pi", dst: ".pi" }` + `SELF_INSTALL_HARNESSES` に `"pi"`(plugin-projection.ts:59)、#3097 = 07 表に追加 4 manifest 行(grep -c = 4) |
| code-generation §12a | PASS | 3 unit とも iteration 1 READY(code-generation diary 2026-08-16T17:30:00Z)。逸脱は全件申告 + 梯子裁定(E-AD-6C190CAF / 22BD77EC / 5DD8BB00 / 528D74AF) |
| TDD・落ちる実証 | PASS | 各 unit の code-summary に Red→Green と注入 → 赤 → revert の実測を記録(nsd: negative test 先行 Red、pi: 固定件数ピン + 新述語 9 fail → Green、sen: 拡張後 5 pass/6 fail → Green + 注入 3 種)。レビュー是正ラウンドでも同規律を維持(sen 是正 `4cc5a99dd` = 落ちる実証 3 セット + conductor 独立注入 1 件) |
| build-and-test | PASS | build-test-results.md: conductor 統合断面 build exit 0・gate 実走 pass・参照掃引 0 行、3 PR の必須 CI success(判定は着地前断面に限定と明記) |
| tla-authoring | PASS(non-target) | 適用性 = non-target(model-map implPath 11 件 × 変更ファイル交差 0 の実測)。terminal receipt は実 HUMAN_TURN への provenance で束縛(tla-authoring diary) |
| formal-model-check | PASS(NOT_APPLICABLE) | 直前 outcome non-target につき本線 stage は TLC 非起動(stage 契約どおり)。補足: advisory 起点の単段実行が登録 4 モデル全て NOT_DETECTED(exit 0)を別途実測済み(formal-model-check diary) |
| pr-convergence | PASS | 3 PR とも converged report(`converged: true`)確定後に merge queue で着地: #3157 → `70ae76122`(+是正 #3162 → `aac8df6f2`)、#3161 → `2493c6165`、#3158 → `2555e5b42`。毎 push のスレッド sweep は最終 head で unresolved 0 を実測 |
| Issue クローズ | PASS | #3155 / #2363 / #3097 すべて CLOSED (COMPLETED) を gh issue view で実測。クローズは PR MERGED + 着地面 grep 検証後(上行) |
| main の健全性 | PASS | 着地後の main: Evidence Reconcile success(nsd 直後の赤化は是正 PR #3162 で回復、pi / sen では再発なし)、merge group CI green ×3 |
| 未解決 BLOCKER | PASS | 全 §12a verdict READY、未解決レビュースレッド 0 件、失敗中の必須 CI なし |

## 申し送り(intent 完了へ)

- 未検証面(verdict-names-unverified-facets): main `2555e5b42` の post-merge CI は本 phase-check 起草時点で in_progress(merge group green が blocking 正本。完走確認は workflow 完了処理で実測する)
- follow-up 候補(スコープ外・diary 記録済み): git-drift PostToolUse 非発火仮説、DIST_FACES の pi 不在(t369 / t-scope-promotion)、07 スキーマ例 face の述語未被覆、sen 報告の packages/tests 内 stale glob 引用 6 件
- §13 学習: code-generation 2 件 + pr-convergence 3 件を project Learnings Inbox へ persist 済み(formal-model-check は 0 件裁定 auto-decision-d51abab6)
