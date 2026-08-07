# Intent Capture — 質問票

- **Intent**: `260807-stage-perf-report`
- **Stage**: intent-capture (1.1 / IDEATION)
- **Scope**: self-feature / **Depth**: Standard
- **Mode**: chat(質問 0 件 — 下記判定)
- **起点**: GitHub Issue [#2405](https://github.com/amadeus-dlc/amadeus/issues/2405)(Issue-first、クロスレビュー 2 名成立: reviewer-1 / reviewer-2 とも CONFIRMED_WITH_REFINEMENTS、訂正は本文 v2 へ反映済み)
- **Mirror Issue**: [#2409](https://github.com/amadeus-dlc/amadeus/issues/2409)
- **測定 ref**: `4a3da7d62`(= worktree base、origin/main)

## 質問しない事項(Issue #2405 本文 v2 で確定済み — 前提として成果物へ反映)

`cid:intent-capture:c1`(事前裁定済みの事項は質問せず前提知識として反映)および
`cid:requirements-analysis:c1-xrev-verdict-not-ruling-authority`(Issue 本文が逐語で指名する canonical は
未裁定ではなく執行事項)に基づき、以下は質問対象から外す。本 intent の質問は **0 件**。

- 対象: 監査シャード(全 intent 横断)+ record からのステージ別性能実測レポートを生成する read-only CLI
- 集計軸: 実作業時間(idle 減算後、素の wall-clock 併記)/ §12a レビューイテレーション数(record の `## Review — Iteration N` ブロック由来)/ センサー FAILED 率
- モデル帰属: subagent = #2279 の Model/Model Source 属性(forward-looking)、conductor・v1 履歴 = UNKNOWN 区分で fail-closed 可視化。記録ギャップの解消は別 Issue へ切り出し
- 設計制約(完了条件として確定): 2 世代スキーマ正規化 / intent 帰属はシャードパス由来 / idle 減算(STAGE_AWAITING_APPROVAL〜GATE_APPROVED / WORKFLOW_PARKED〜UNPARKED / SESSION_ENDED)/ 秒粒度の限界明記 / 破損・欠落の無音スキップ禁止 / 落ちる実証
- 決定性契約: LLM 側カウントゼロ・read-only(audit/state 無変更)
- 実装形態(新規 CLI vs `amadeus-subagent-stats.ts` 拡張)と命名(`amadeus-observability` 名前空間は書き手 seam のため不使用)は**要件・設計段の裁定事項**として Issue が明示 — intent-capture では問わない
- 種別 `enhancement` / 優先度 `P2`

## 裁定の記録

- 質問 0 件の判定根拠: 上記のとおり全事項が Issue #2405 v2(クロスレビュー 2 名の独立実測による訂正を反映済み)で一意に確定しており、真に未決の判断は要件・設計段へ正規に委譲済み(E-OC1 判定種別: 一次証拠による既決)。
- 着手指示: ユーザーの実 HUMAN_TURN「2405対応して」(#2405 起票 2026-08-07T09:41:15Z の直後、本セッション)。
- ユーザー承認: 2026-08-07T10:37:08Z(intent-capture ゲート承認 — 質問 0 件判定・§13 選挙 E-SPR-ICS13 の 0 件裁定を含む)
