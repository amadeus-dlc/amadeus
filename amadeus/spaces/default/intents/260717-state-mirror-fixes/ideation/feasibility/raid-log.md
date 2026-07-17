# RAID Log — 260717-state-mirror-fixes

上流入力(consumes 全数): intent-statement.md

前 intent からの RAID 引き継ぎ: なし(本 intent は Issue #1170/#1172 を起点とする新規 fix バッチ — feasibility:c2 の再実測対象となる引き継ぎ台帳は存在しない。両 Issue の現存は 2026-07-17 のクロスレビュー2名+本セッションの gh 実読で実測済み)。

## Risks(リスク)

| ID | リスク | 影響 | 緩和策 | 状態 |
|---|---|---|---|---|
| R1 | #1170 のガードが過剰抑止になり、並行セッションの正当な前進書き込み(実際に進行中のステージへの遷移)まで no-op 化する | 進捗表示の停滞・statusline 不整合 | 設計ステージで前進/後退の判定基準(ステージ順序・checkbox 状態遷移)を明確化し、前進系のテストケースを両側実測(corpus-sweep 的に正当データで赤にならないことも確認) | open(設計持ち越し) |
| R2 | ガード実装が hooks(spawn 経由)に置かれ coverage patch gate で赤になる | PR 差し戻しループ | T4 制約どおり判定ロジックを exported 純関数化し in-process seam でテスト(bun-coverage-spawn-blindspot 既決の適用) | open(実装時適用) |
| R3 | 修正対象の `handleSetStatus` / `setCheckbox` は他経路(正当な set-status・jump 等)からも呼ばれる — 同根パターンの棚卸し漏れで別経路の巻き戻りが残存 | 修正の不完全閉包 | same-root-inventory 既決: 書き込み経路の全数 grep 棚卸しを要件段で実施し、enumeration-completeness-review でレビュー段の独立再列挙を行う | open(要件持ち越し) |
| R4 | 260717-mirror-issue-tool record の state 修復(5a0cd1e6e で固定された巻き戻り)を修正 PR と別立てにすると、#1172 検証(approved 18/18)が現データで通らない | 検証の齟齬 | 修復の実施単位(同一 PR か別コミットか)を設計段で確定(クロスレビュー e3 所見「修正時は state 修復も併せて必要」を留保付きで持ち越し) | open(設計持ち越し) |

## Assumptions(前提)

| ID | 前提 | 確信度 | 検証方法 |
|---|---|---|---|
| A1 | #1170 の書き手は sync-statusline フック経由の set-status である(他の書き手は関与しない) | 高(ユーザー実測: Last Updated と sync-statusline.last の秒単位一致+e2 のコード裏付け) | 要件段で書き込み経路の全数列挙により反証確認(R3 と対) |
| A2 | #1172 の SKIP 様式は `- [ ] <stage> — SKIP` のみで、`[S]` はジャンプ skip 専用 | 高(e2 実測: state 内 `[S]` 0件・`— SKIP` 14件。format-currency 準拠の現世代 grep 済み) | テスト fixture に両様式を含めて封鎖 |
| A3 | 修正は既存テストランナー(bun test 4層)で検証可能 — 新規テストインフラ不要 | 高(類似の hook/tool テストが tests/ に多数実在) | 実装時のテスト配置で確認(fs を触る検証は integration 層 — fs-tests-integration-first) |

## Issues(顕在化済み課題)

| ID | 課題 | 状態 |
|---|---|---|
| I1 | 現 origin/main HEAD で 260717-mirror-issue-tool の state が巻き戻ったまま(`[-] nfr-requirements`、Active Agent 逆行 — 5a0cd1e6e) | open — 実測 2026-07-17(e3 クロスレビュー)。修正 intent のスコープ内で修復予定(R4 参照) |
| I2 | mirror Issue #1179(本 intent)の状態行が `approved 3/32` と誤表示 — #1172 のライブ再現 | open — 実測 2026-07-17T17:43Z(本セッション sync 出力)。#1172 修正で解消見込み、既知として放置 |

## Dependencies(依存関係)

| ID | 依存 | 方向 | 状態 |
|---|---|---|---|
| D1 | Construction 進入はユーザーの着手決定に依存(issue-selection-user-decides) | 外部(ユーザー) | 待ち — 本 intent は Ideation まで park |
| D2 | #1170 修正は正本→dist×6/self-install の再生成面と交差 — 並行 PR とのファイル単位非交差判定(c6)が着手時に必要 | 内部(他 intent/PR) | open — 着手時に実 diff で判定 |
| D3 | #1172 の検証(approved 18/18)は D2 と独立だが、現データでの実測は I1 の修復に依存(R4) | 内部 | open |
