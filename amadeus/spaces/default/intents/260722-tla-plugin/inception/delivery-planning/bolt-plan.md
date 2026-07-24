# Bolt Plan — 260722-tla-plugin

上流入力(consumes 全数): requirements(FR-1〜6/NFR)、components(C-1〜C-8+C-3b・規模)、unit-of-work(5 Unit)、unit-of-work-dependency(DAG)、unit-of-work-story-map(体験写像)、team-practices(変更なし — 既存 Way of Working 適用)

## Bolt 編成(Q1裁定: 4 Bolt)

| Bolt | Unit | 内容 | ゲート | 推定規模 |
|---|---|---|---|---|
| Bolt 1(walking skeleton) | U1 tla-externalize + U3 run-model-check | 最薄 E2E: specs/tla/ 外部化 → TlcSpawnPlanner+CLI → 外部化モデルの完全探索1回(バイト一致+既知欠陥再現は build-and-test で最終確定)。R4 を潰す | **常時ゲート**(walking skeleton) | 実装約610行+テスト約350行 |
| Bolt 2 | U5 completeness-sensor | sensor manifest+実装+model-map.json、両側実測(落ちる/正当) | 自律モード次第(ladder) | 実装約200行+manifest約40行+テスト約150行 |
| Bolt 3 | U2 plugin-skeleton | walk 拡張+plugin バンドル+compose→compile→--single 実行 E2E+drop 検証。R3 を潰す | 自律モード次第 | 実装約80行+md/json約150行+テスト約150行 |
| Bolt 4 | U4 ci-integration | ci.yml formal ジョブ+formal-verification.yml 削除+dispatch 実測 | 自律モード次第 | yml約45行+テスト約50行 |

順序: Bolt 1 → Bolt 2 → Bolt 3 → Bolt 4(DAG 準拠: U2←U3+U5、U4←U3。Bolt 2 と Bolt 4 は依存上 Bolt 1 着地後に並行可能だが、並行編成の実施は Construction Autonomy Mode と資源状況で conductor が判断)

## Bolt 1(walking skeleton)の受け入れ基準

1. specs/tla/FormalElection.{tla,cfg} 実在+tla-arm.ts の埋め込み削除(二重保持なし)
2. `bun scripts/formal-verif/run-model-check.ts --model specs/tla/FormalElection.tla --cfg specs/tla/FormalElection.cfg --out <dir>` が exit 0(完全探索完走)
3. 既存検証コマンド(typecheck/lint/dist:check/promote:self:check/tests --ci)green
4. ladder プロンプト: Bolt 1 ゲート承認後に1回だけ提示し、Construction Autonomy Mode を state に記録

## マージ運用

各 Bolt は短命ブランチ+PR、`main` へスカッシュマージ(org Way of Working)。Bolt ブランチのベース・マージターゲットとも main。PR 作成前 deslop+全検証再実行、マージはユーザー承認後に実行(no-AI-merge)。
