# Performance Test Instructions — intent 260813-advisory-requestion-fix

## 判定: 適用可能な性能 NFR は存在しない

本 intent では性能テストを**生成しない**。これは省略ではなく判定である(cid:build-and-test:c2-no-test-theatre-for-absent-nfr — 合否を決める数値目標が要件に宣言されていないテスト種別は体裁のために実体を作らない)。

## 根拠

- `requirements.md` §非機能要件が「適用可能な数値目標を持つ NFR は存在しない」と判定済み(Issue #2967 は挙動契約の回復のみを要求し、性能目標の宣言が上流に無い)
- 本修正は `next` の advisory guard 段に分岐1つと型付き outcome を足すのみで、ループ・I/O・外部呼び出しを追加しない(`code-summary.md` 変更ファイル参照)

## この判定を覆す条件

- 将来の変更が `next` のホットパスへ測定可能な遅延(例: 追加のファイル I/O、ネットワーク呼び出し)を導入する設計になった場合、性能 NFR を宣言したうえで当該経路のベンチマークを追加する
