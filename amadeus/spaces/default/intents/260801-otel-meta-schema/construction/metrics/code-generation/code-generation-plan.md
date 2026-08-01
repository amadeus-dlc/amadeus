# Code Generation Plan — U5 metrics(Bolt 2c)

上流入力(consumes 全数): functional-design 3成果物、nfr-design 5成果物、requirements.md FR-MET-1〜4 — 実シグネチャ準拠配線・INSTRUMENTS 閉集合5計器・cardinality 統制・meter 未登録 no-op を FD から、fail-open 3経路の検証形を nfr-design から導出。E-OMSB1-DEV 留保2件(実 hook spawn の store 行 session.id 実測 / hook supply 行の落ちる実証)を必須受け入れ項目として焼き込み。

## 実行形態

gated swarm batch 2(worktree `bolt-metrics`)。TDD 必須・PR 1本・NFR-4 同一変更。

## 経過(実績)

1. 実装+検証全 green(逸脱6件を実装後申告 — 実装前停止が正だった点は PM 材料)
2. **E-OMSB2C-DEV**(2-0)で6件全承認: (1) registerMeterProvider へ projectDir (2) metrics-vocabulary leaf 分離 (3) setTokenUsageSink 注入 (4) gate.iterations = stage.revising(二重計上回避) (5) subagent.duration は U4 待ち (6) pending-*.start マーカーファイル。留保 = stale marker 回収を #1909 起票、Relay 非一致テストの selector 駆動化も同 Issue へ
