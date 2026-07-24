# Units of Work — 260722-tla-plugin

上流入力(consumes 全数): components(C-1〜C-8+C-3b)、component-methods、services、component-dependency、decisions(ADR-1〜7)、requirements(FR-1〜FR-6/NFR)

## Unit 一覧(5 Unit — proto-Unit P1〜P5 と 1:1)

| Unit | 名称 | 含むコンポーネント | 対応 FR | 推定規模 |
|---|---|---|---|---|
| U1 | tla-externalize | C-4(TlaModelLoader)+ C-5(specs/tla/ 資産) | FR-3.1、FR-3.2(検証は build-and-test 委譲) | 実装約60行差替+.tla約310行転記+map約20行+テスト約100行 |
| U2 | plugin-skeleton | C-1(walk 拡張)+ C-8(plugin バンドル) | FR-1.1〜1.4、FR-2.1〜2.4 | 実装約80行+md/json約150行+テスト約150行 |
| U3 | run-model-check | C-2(CLI)+ C-3(TlcSpawnPlanner)+ C-3b(prepare/run 委譲リファクタ) | FR-3.3〜3.6 | 実装約550行+テスト約250行 |
| U4 | ci-integration | C-7(ci.yml formal ジョブ+旧 workflow 削除) | FR-5.1〜5.4 | yml約45行+テスト(workflow 静的検証)約50行 |
| U5 | completeness-sensor | C-6(sensor manifest+実装) | FR-4.1〜4.4 | 実装約200行+manifest約40行+テスト約150行 |

横断要件: FR-6(dist 同期・検証コマンド・カバレッジ・テスト層)は全 Unit に適用。NFR の全数帰属(iteration 1 Minor-2 是正): NFR-1(再現性)= U3+U4、NFR-2(実行時間 30分内)= U4(CI タイムアウト設定)+U3(単発 run 予算)、NFR-3(検証劇場禁止)= 全 Unit、NFR-4(可逆性)= U2。

## 各 Unit の完了条件(要約)

- U1: specs/tla/FormalElection.{tla,cfg} が存在し、tla-arm.ts が外部読込に置換され(埋め込み削除)、identity 同値がテストで固定される
- U2: compose→compile→`next --stage formal-model-check --single` の E2E が実 compile+実 orchestrate で green。drop 後 compile が 0-plugin baseline と byte-identical
- U3: run-model-check CLI が exit 0/1/2+ 契約で動作し、Darwin/Docker 両 planner の落ちる実証(両側)を含む
- U4: dispatch 発火で formal ジョブのみが走り、push/PR で走らないことが workflow 構造で保証される。formal-verification.yml 削除
- U5: ドリフト注入で SENSOR_FAILED(赤)・同期状態で PASSED の両側実測。map 不在 FAILED(fail-closed)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T13:05:40Z
- **Iteration:** 2
- **Scope decision:** none

前回4件はCLOSED。新規Major1件(walking skeleton節がDAG是正後と矛盾+実装順序推奨のステージ契約疑義)— 是正提案(a)節削除/(b)中立化。conductorが機械検証可能クラスとして是正・実測固定のうえゲートで人間裁定に付す(E-LSSADS13分岐b)。

### Findings

- None
