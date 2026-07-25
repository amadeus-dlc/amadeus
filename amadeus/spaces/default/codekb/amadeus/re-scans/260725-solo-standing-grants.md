# 260725 Solo Standing Grants 差分再走査

## 観測メタデータ

- Date: `2026-07-25`
- Base: `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`
- Observed: `4491310cc0b432eb404524ef30a7d8a0a3f68f73`
- Focus: [Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)
- [PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ。根拠・実装前提にしない。
- Diff: 373 files、`+71,339/-811`。Issue 関連 canonical grant / presence / provenance 面は base から無変更。orchestrate plugin 系 `+109/-3` は後続実装時の同時編集面である。
- Method: canonical core、監査・state・directive・orchestrator の経路と関連テストを差分再走査し、設計を確定せず seam と不変条件を合成した。

## 現行 team flow と solo 差分

team flow は human-grounded `GRANT_ISSUED`、全 intent / shard の revoke・expiry・provenance 検証、gate 適格性判定、必要時の `DELEGATED_APPROVAL`、lock 内 approval commit から成る（`amadeus-state.ts:2870-2968,3110-3226`、`amadeus-lib.ts:3772-3978`）。grant は config でなく監査イベントから導出される。

solo は remote delegation を必要としない。現行 `RunStageDirective` と `ReportFlags` / `approveArgs` に authorization / Grant Id carrier がなく（`amadeus-directive.ts:59-90`、`amadeus-orchestrate.ts:3003-3045,3293-3297`）、route と commit の間で expiry / revoke / 別 grant 選択が変化する TOCTOU がある。active grant 探索は exact ID lookup でなく最大 expiry 候補を返し、同値 tie-break はない。

## gate existence と authorization source

gate existence は graph、scope、phase transition、walking skeleton stance、per-unit coverage で決まる。authorization source は fresh `HUMAN_TURN`、verified delegation、eligible standing grant のどれで解決するかであり、別概念である。

phase boundary は include flag と phase-check artifact が必要。walking skeleton が有効な first Construction は grant 対象外。per-unit 5ステージは未完 unit で `gate:false`、全 unit artifacts 着地後の最終 gate だけが grant 対象で、body / reviewer は再実行しない（`amadeus-orchestrate.ts:2456-2639,3503-3560`）。

## 監査・fallback 不変条件

一般 audit CLI は `HUMAN_TURN`、delegation、grant event の mint を拒否し、issuer shard の実 `HUMAN_TURN` を参照検証する（`amadeus-audit.ts:826-880`、`amadeus-lib.ts:3703-3755`）。grant 使用 approval は `Grant Id` を相関する。

現行認可拒否は `error()` → `ERROR_LOGGED` → exit 1、report child non-zero → error directive → best-effort `ERROR_LOGGED` へ流れる。したがって commit 時失効は既存 error 経路へ流せない。fallback は `emitApprovalAudit`、state write、advance より前で停止し、`ERROR_LOGGED`、`GATE_APPROVED`、`STAGE_COMPLETED` を残さず人間ゲートへ戻す必要がある。

## 後続設計で裁定する候補

1. directive → report → approve へ exact Grant Id を運び、lock 内で同じ ID を再検証する。
2. opaque authorization claim を運び、state 層が監査由来 grant へ解決する。
3. route は advisory に留め、commit-only selection を維持する。

具体案、solo の発行・取消解禁範囲、typed non-error outcome の配置は未決定。team delegation path、protected mint、phase boundary、walking skeleton、per-unit final gate は変更しない。

## テスト・品質

関連テストは `t-standing-grant`、`t112-delegated-approval`、`t188-human-presence-gate`、`t208-presence-crossshard-tiebreak`、`t-delegate-answer-consume`、`t115`、`t186-foreach-per-unit-iteration`、`t251-swarm-and-next-stage`。Developer scan では合計178件成功し、dist 6 harness check と promote 4面 check も成功した。`bun run check` は依存未導入の `tsc: command not found`（exit 127）で未判定。

負債は broad catch、Grant Id parse shape、raw filesystem audit fabrication、route / commit identity と carrier の欠如、二重 error aggregation。実装方式はこの再走査では確定しない。
