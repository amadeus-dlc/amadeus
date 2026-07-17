# Reliability Requirements — standing-grant(U1)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`(純関数構成・エラー処理方針)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、codekb `technology-stack.md`(Bun/TS/Biome — 本日 RE 現況)

## 要件

- RL-1: 検証欠陥の非伝播 — グラント検証の失敗(シャード読取不能・parse 不能)は null(=不在)へ倒し、従来経路のゲート解決を止めない(refuse 側にのみ倒れる — FD エラー処理方針)
- RL-2: 決定性 — 入力はシャード内容+現在時刻のみ(乱数・外部サービスなし)。同一入力・同一時刻で同一判定(C-6 で2回実行一致をピン)
- RL-3: 結果整合の有界性 — 撤回伝播の遅延窓は TTL(4h)が上限(ADR-2)。無期限露出は構造的に生じない

## 検証対応

RL-1 = 一時状態 fixture(壊れ行・HUMAN_TURN 欠落シャード)、RL-2 = 決定性ピン、RL-3 = TTL 境界 fixture(AC-5b)。
