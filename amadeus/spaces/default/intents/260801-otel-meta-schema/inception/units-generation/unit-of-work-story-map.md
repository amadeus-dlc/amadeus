# Story Map — otel-meta-schema

上流入力(consumes 全数): requirements.md、components.md、component-methods.md、services.md、component-dependency.md、decisions.md — 各 Unit の利用者価値は requirements.md の FR 動機へ対応付け、段の順序は unit 依存(component-dependency.md 由来のエッジ)に整合。API の露出面(component-methods.md)と非目標(services.md の Relay 無改変)、ADR の帰結(decisions.md)を価値記述の制約として参照した。

## 価値の流れ(運用者視点)

| 段 | Unit | 運用者が得るもの |
|---|---|---|
| 1 | U1 resource-core | trace/log/metrics に「どの環境・どのハーネス・どのモデル・どのセッション・どのコミット断面か」が載る — 並走切り分けとバグ再現の一次情報 |
| 2 | U2 span-attrs | span 単体から「どの intent・どのステージの操作か」が読める |
| 3 | U3 exception | 失敗スパンにスタックトレース(redaction 済み)— バグ改修の直接材料 |
| 4 | U4 subagent-started | subagent の起動が監査に残り、未完了(idle 死)を機械検知できる |
| 5 | U5 metrics | トークン消費・ステージ所要・差し戻し回数・エラー率のダッシュボード素材 |
| 6 | U6 docs | スキーマの公式参照(実装と1:1) |

## 非目標の確認

Relay/collector 側の可視化体験は本 intent の価値に含めない(services.md の境界)。価値はすべて「store に載るメタ情報の充実」で完結する。
