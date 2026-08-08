# Logical Components — u3-question-route-observability

上流入力(consumes 全数): business-logic-model.md(フロー)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 論理構成(層別保証)

| 論理コンポーネント | 実体 | 保証機構 |
|---|---|---|
| Route Deriver | answer 記録経路内の純関数(decision-id → Route) | 導出の定義による構造的整合(ladder iff id)— unit テスト |
| Id Format Checker | 同経路の入力検査(渡した場合のみ) | 正規表現1点・loud error — unit テスト |
| Attribute Emitter | 既存 `QUESTION_ANSWERED` emit の属性拡張 | 後方互換(属性追加のみ)— 旧形 fixture の integration テスト |
| Bypass Aggregator(u5 所有) | 集計述語(human × semi/full) | u3 は述語の成立要件(属性の実在)だけを保証 — 実測 fixture の integration テスト |

## テスト層配置

- 純関数(導出・形式検査)は unit 層
- 実 shard 読み書き(旧形混在・fixture 検出)は integration 層(fs-tests-integration-first)
- push 前 lcov で配線行 DA 確認(lcov-wiring-line-checklist)
