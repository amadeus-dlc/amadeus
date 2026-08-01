# Performance Test Instructions — formal-verif-value-chain

上流入力(consumes 全数): requirements, nfr-design(各 unit の performance-design), code-generation

比例選定(bt-proportional-selection): 承認済み NFR と実在境界へ trace できる検査のみ生成し、負荷試験・auto-scaling 検査は機械追加しない。

## 実施した性能面の実測

- **TLC 完全探索の有界性**(u7 NFR — finite-exploration-not-detected-proof の完走要件): AsIntended = 208,628 states / 89,099 distinct / depth 18 / **06s 完走**(tla2tools 1.7.4、実測 verbatim は u7 code-summary)。有限ドメイン(MaxReceipts=3)の設計自体が探索コストの上限根拠。
- **advisory 判定の定常コスト**(u5): spec ハッシュは watch 対象ファイルの逐次 SHA-256(specs/tla 実測 9 ファイル規模)で、`next` の対象3ステージでのみ発火 — 実測で `next --single` の応答に体感遅延なし(u8 e2e 実測の範囲)。専用ベンチは対応 NFR 数値が存在しないため生成しない(根拠: nfr-requirements に応答時間の数値要件なし)。

## 生成しなかった検査と根拠

- 負荷試験・スループット検査: 常駐サービス面が存在しない(CLI/ファイル境界のみ — nfr-design:c1)。
- t258/t259 系の性能 ratchet: 既存 daily perf workflow(#1851 で PR blocking から分離済み)がカバー — 本 intent は当該経路に非接触。
