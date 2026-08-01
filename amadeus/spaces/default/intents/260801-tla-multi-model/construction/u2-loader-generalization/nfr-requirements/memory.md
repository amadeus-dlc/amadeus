# Memory — nfr-requirements / u2-loader-generalization

## Interpretations

- 2026-08-01T21:47Z — 定量 NFR の不在を「構造的拘束」(読込回数・計算量・fail-closed・決定性)へ翻訳して記載; 短命 CLI 検証ツールに応答時間 SLA を置いても測定不能なため
- 2026-08-01T21:47Z — TLC 探索の時間予算は u5 の責務とし u2 では「loader が探索時間に寄与しない」前提条件のみ記載; 責務の重複設定を回避

## Deviations

- なし(stage ファイルの produces 5 ファイルを全て生成)

## Tradeoffs

- 2026-08-01T21:47Z — 質問ステップ(Steps 4-5)はスキップせず実質回答済みとみなした; NFR-1〜4 が requirements.md で確定済み(Q1/Q2 確定、Open questions なし)で曖昧さが残らないため

## Open questions

- 空 models ガード(BR-S6)の条件確定は code-generation 冒頭の u1 parser 実測に依存 — RR-U2-1 のカバレッジに影響するため実測結果を本ディレクトリまたは business-logic-model.md §6 へ追記すること
