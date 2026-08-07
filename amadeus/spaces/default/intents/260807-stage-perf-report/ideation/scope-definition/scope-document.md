# Scope Document — 260807-stage-perf-report

上流入力(consumes 全数): intent-statement(ideation/intent-capture/intent-statement.md — Problem Statement・成功指標・スコープシグナルを本書の境界導出の根拠として消費)

## In Scope(本 intent で出荷する範囲)

intent-statement の Problem Statement(ステージ性能軸の読み手不在)を解消する最小の実行可能単位として、以下を出荷する。正本は Issue [#2405](https://github.com/amadeus-dlc/amadeus/issues/2405) 本文 v2。

1. **read-only 集計 CLI**(1 本): 全 intent の監査シャード+record のレビューイテレーションブロックを走査し、ステージ別の性能実測レポートを Markdown / CSV で決定的に出力する
2. **集計軸 3 本**(いずれも Must):
   - 実作業時間 — STAGE_STARTED→COMPLETED 窓から idle 区間(STAGE_AWAITING_APPROVAL〜GATE_APPROVED / WORKFLOW_PARKED〜UNPARKED / SESSION_ENDED)を減算。素の wall-clock 併記。秒粒度の限界明記
   - §12a レビューイテレーション数 — record の `## Review — Iteration N` ブロック由来(監査でなく)
   - センサー FAILED 率 — SENSOR_FIRED/PASSED/FAILED × stage slug
3. **モデル帰属**: subagent = Model/Model Source 属性(#2279、forward-looking)。conductor・v1 履歴は UNKNOWN 区分で fail-closed 可視化
4. **成立条件の機構**: 2 世代スキーマ正規化 / intent 帰属はシャードパス由来 / 破損・欠落の無音スキップ禁止(件数報告) / 落ちる実証テスト
5. **配布**: 全ハーネスへの投影(core/tools 配置 — 正確な配置は設計段)

## Out of Scope(明示的に出荷しない範囲)

- 記録側の拡張(conductor モデル・ハーネス種別のイベント属性追加)— **別 Issue へ切り出し**(intent-backlog 参照)
- トークン集計 — #2010(telemetry 側)の領域
- 前向き eval 基盤(promptfoo 等)— 本 CLI の基準線を前提とする後続 initiative
- intent 難易度差の正規化(モデル間比較の統計的妥当性の高度化)— クロスレビューが「交絡除去後に残る未検証事項」と明記した将来課題
- 既存 `amadeus-subagent-stats.ts` の subagent 軸機能の変更(参照・再利用は可、破壊は不可 — FR-013 相当の互換維持)

## スコープの検証可能な境界

- install しない/実行しないワークスペースへの影響ゼロ(read-only・audit/state 無変更)
- 完了条件は Issue #2405 v2 の 8 項目チェックリストが正本 — requirements-analysis でテスト可能な形に固定する
