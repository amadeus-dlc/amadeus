# Performance Requirements — answer-evidence-sensor

上流入力(consumes 全数): unit FD 4点(`../functional-design/business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)、codekb `technology-stack.md`(Bun/TS/Biome 前提)。

## 要件

- P-1: sensor script 単発実行は manifest `timeout_seconds` 内に完了する。値は既存 required-sections の 5 秒を踏襲(nfr-requirements:c3 — 強制メカニズム由来の数値。検査は単一ファイルの read+正規表現で、既存 sensor と同オーダー)。
- P-2: 発火面は matches 狭 glob により questions 書込み時のみ — 通常ステージ実行への性能影響は追加 spawn 0(非 questions 書込み時)。

## 検証

timeout はディスパッチャの既存強制(amadeus-sensor.ts のタイムアウト機構)に委ね、専用性能テストは追加しない(比例選定 — build-and-test:c1)。
