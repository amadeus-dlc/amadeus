# RAID Log — mirror-productization

> 上流入力(consumes 全数): intent-statement.md

## Risks

| ID | リスク | 影響 | 緩和 |
|---|---|---|---|
| R-1 | engine 変更(phase 境界 ask)が next 出力消費系テスト(t135 類)を壊す | CI 赤・後戻り | C-08 の事前棚卸し+stdout 契約維持(advisory は指令 JSON フィールドで運ぶ) |
| R-2 | gh optional 化の loud-fail が CI(gh なし環境)で誤発火 | 偽赤 | ミラー機能のテストはモック gh(PATH 差し替え)で CI 非依存化。実 gh 面は手動受け入れ |
| R-3 | 3層 config の解決順が将来キー追加時に曖昧化 | 設定挙動の不一致 | 解決規則(下位優先・キー単位上書き)を初版でテスト固定 |
| R-4 | auto-mirror sync の phase 境界発火が record 未コミット状態と競合(sync が古い状態行を読む) | 誤った状態行が Issue へ | sync 前の state 読取は disk 現在値(既存 mirror.ts 契約)— 発火位置を phase-check 完了後に置く(design で確定) |

## Assumptions

- A-1: 現行 mirror.ts の3 verb 契約は安定(#1222 で運用実証済み)— 移設で挙動変更しない(仮説ではなく実測ベース)
- A-2: 配布先ユーザーの GitHub リポジトリ運用は gh auth 済みが多数派(仮説 — 不在でも loud-fail で安全)

## Issues

- 現時点なし(前 intent からの引き継ぎ RAID なし — 本 intent は grilling 起点の新規)

## Dependencies

- D-1: e1 実装中の election intent とはファイル面で非交差の見込み(mirror は core/tools+engine、election は scripts/amadeus-election*+elections/)— construction 並行時に c6 実 diff 判定を行う
- D-2: gh optional ノルム改定(P-01)が実装マージの前提
