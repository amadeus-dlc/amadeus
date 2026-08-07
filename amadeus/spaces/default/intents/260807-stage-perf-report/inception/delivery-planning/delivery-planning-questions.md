# Delivery Planning — 質問票

- **Intent**: `260807-stage-perf-report`
- **Stage**: delivery-planning (2.8 / INCEPTION)
- **Mode**: Guide me(2026-08-07T15:42:52Z 選択)

## 質問しない事項(既決 — 前提として成果物へ反映)

`cid:intent-capture:c1` および既決ノルム・上流成果物からの一意導出により、以下は質問しない:

- 順序ヒューリスティック(risk-first / value-first / WSJF): Unit が 1 つ(U1 stage-stats-cli)のため Bolt 間順序の経済判断が発生しない — 順序空間が自明
- 並列実行: 同上(Bolt 間並列の余地なし)
- 外部依存: 完全ローカル(read-only CLI、外部 API・承認・他チームハンドオフなし)— external-dependency-map は空に近い軽量形(ステージ定義が明示的に許容)
- mob 割当: ソロモード+team-formation SKIP のため amadeus-developer-agent(既定)
- walking-skeleton ゲートの維持: project.md Mandated「self-feature なら最初の Construction Bolt に walking-skeleton gate を維持」— 裁定不要の執行事項

## Q1: Bolt 編成(粒度)

`cid:units-generation:c1`「Bolt 粒度は 2.8 の設問として intent ごとに選び、固定しない」に基づく本 intent の選択。U1(単一ファイル CLI、約 700〜900 行+twin テスト、複雑度 M)をどう Bolt へ編成するか:

A. **単一 Bolt(U1 全体を 1 Bolt で実装)** — 推奨。凝集した単一ファイルで分割の実益(並列)がなく、Bolt = PR の原則で 1 PR に焦点が収まる。walking-skeleton ゲートは Bolt 1(=唯一の Bolt)のゲートとして維持される
B. 2 Bolt 分割 — Bolt 1 = 最小 e2e スケルトン(走査→1 統計→Markdown 出力)、Bolt 2 = 残機能(idle 減算・レビュー集計・センサー・モデル帰属・CSV/JSON)。アーキテクチャ検証を先行させるが、PR 2 本と中間契約の設計コストが増える
X. Other(具体的に指定)

[Answer]: A(2026-08-07T15:44:04Z — Guide me で「A. 単一 Bolt(推奨)」を選択。単一 Bolt、walking-skeleton ゲート維持)

## 裁定の記録

- 質問 1 件(Q1)は Guide me モードで回答済み。他事項は既決ノルム・上流からの一意導出(E-OC1 判定種別: 既決ノルム・承認済み上流による既決)。
- ユーザー承認: 2026-08-07T15:44:04Z(Q1 = A「単一 Bolt(推奨)」を Guide me で承認 — Bolt 編成裁定の実 human turn)
