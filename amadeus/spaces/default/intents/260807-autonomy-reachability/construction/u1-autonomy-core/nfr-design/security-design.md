# Security Design — u1-autonomy-core

上流入力(consumes 全数): business-logic-model.md(認可フローの構造)。nfr-requirements 系5成果物は nfr-requirements SKIP により未生成(設計どおりの不在)— セキュリティ制約は requirements.md NFR-1 と #2253 既決(FR-GRT-006)を直接参照。

## 認可境界の不変

- `authorizeInteraction` の判定意味論・戻り値は一切変えない(BR-U1-5 の対照テストで固定)— 可視化は観測のみで、認可の緩和・迂回経路を作らない
- provenance 検証(実 HUMAN_TURN 要求・フラグ非 provenance)は不変。canonical 化は書込点の集約であり権限面の変更なし

## 新設イベントの情報面

- `INTENT_AUTONOMY_HUMAN_REQUIRED` の属性は kind/stage/reason/mode のみ — 機微情報(質問本文・ユーザー入力)を含めない。telemetry export 境界の redaction 対象語彙も増やさない(cid:practices-discovery:export-boundary-redaction と整合 — 対象外語彙のみ)
- audit は append-only・mkdir ロック下(既存契約) — 改竄面の変更なし

## 脅威観点

- なりすまし: emit は engine 内部の同期呼出しのみ(外部入力から reason を注入する経路なし — reason は `authorizeInteraction` の戻り値限定)
- 検証劇場の防止: イベントは実行結果(実際の拒否)からのみ導出(P2)
