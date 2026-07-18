# Performance Requirements — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 要件

- PNR-1: `resolve` は純関数評価+JSON 1 行出力のみで、外部プロセス起動・ネットワーク・FS 読み(env 以外)を行わない(`business-logic-model.md` の副作用境界の性能面。受け入れ = 実装 diff に spawn/fetch/readFile が現れない)
- PNR-2: 性能の数値目標は設けない — bun CLI 起動 ~20ms(`technology-stack.md` の既存前提)に対し resolve の追加コストは決定表 1 回の評価で無視可能。新しいマジックナンバーを導入しない(constants-from-code)

## 検証

- `requirements.md` の性能系 NFR は本 unit に固有項目なし — 明示 N/A(referee 意味論・並行度は U2/既存契約の面)
