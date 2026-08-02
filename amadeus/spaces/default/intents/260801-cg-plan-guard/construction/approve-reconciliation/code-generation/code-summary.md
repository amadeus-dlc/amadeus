# Code Summary — approve-reconciliation(U3、Bolt 3)

上流入力(consumes 全数): code-generation-plan.md、business-rules.md、domain-entities.md、requirements.md

- 着地: conductor ブランチへ --no-ff マージ(`aa032a75d`)。finalize verdict: converged 1 / failed 0(c2 回収、shard は prefix 実測で ours 採用、ls-files -u 0)。

## 実装(FR-4 / FR-2 / FR-6)

- **C4a `swarmEvidenceVerdict`(amadeus-lib.ts、export・全域純関数)**: 宣言 DAG の幅≥2 batch(`wideBatchesOf`)ごとに SWARM 実績(`SWARM_STARTED ∪ SWARM_DEGRADED` かつ `SWARM_COMPLETED`)を突合し、`satisfied` / `missing{batches: DeclaredBatch[]}` を返す。missing 型は Bolt 2 の `DeclaredBatch` を再利用(canonical 1定義)。
- **C4b+ガード本体(amadeus-orchestrate.ts、module-private)**: `collectSwarmEvidence`(audit reader、v1「Batch number」/「Unit names」と v2 の両様式)+`swarmEvidenceRejection`(canonical `guardMessage` へ委譲、weight/exit は Bolt 2 定数を再利用 — approve 専用定数の新設なし)。発動条件は cheapest-first: isGated×未完了 → for_each=unit-of-work×mode=subagent → 非 skeleton-gate → DAG 実在 → verdict missing。`isSwarmDriven` は条件にしない(#1892 の不履行は autonomy 未設定の直列完走を含む)。
- **副作用ゼロ**(BR-U3-6): 突合結果を audit/state/runtime-graph へ書かない(state バイト一致テストで固定)。既存 fail-closed 群は無改変(BR-U3-12)。
- 既知の穴(FD 明示): `amadeus-state.ts approve` 直叩き経路は対象外。

## テスト

- 新規 t402 ×3ファイル: unit(7)/ integration(12)/ **corpus sweep integration(12)** — 実 record 11件の読み取り専用 sweep で拒否5(#1892 不履行4+260712)/通過6(正当直列3+実績あり3)が FD 期待表と完全一致。
- 落ちる実証5注入(AND→OR 弱体化/ガード無効化/DEGRADED 除外/幅フィルタ≥1/exit 部除去)全て赤→復元 diff 0。両側実測(赤側+緑側)。
- pin 群 t211/t186/t403×2/t127/t135/t251/t265 全 green、契約改訂 0(fixture realism 2件のみ: v2 audit 必須フィールド、nfr-design produces 全数)。

## 検証(全 exit 0)

typecheck / lint / dist:check / promote:self:check / coverage:ci(9792 assertions、0 fail)/ patch gate **59/59 covered・allowlist 追加 0** / complexity / registry regen。

## allowlist straddle 検出(c1-allowlist-mechanical-remap の新事例)

59 エントリ全件シフト(stale 検査に映ったのは10件のみ)→ 機械 remap+全59件の直読バイト照合 mismatch 0。このとき既存 waiver レンジ 4380-4392 が新規コード挿入で 13→85 行へ膨張し新規行が waiver を継承する fail-open を検出 — 機械 remap 単独では通過するため、ヘルパー群を移設して straddle 自体を解消(`a65ff06df`)。

## 逸脱申告(全て conductor 受理)

1. D-1 skeleton-gate 除外: READY 済み FD 本文どおり実装(承認済み設計準拠 — stock スコープでは条件5に吸収され不到達)。
2. 観測部の組み立て = 案 B(FD 字面どおり、公開メッセージ API 新設なし)。
3. t401 占有につき t402 採用。corpus sweep は負荷競合(5秒タイムアウト2回実測)によりファイル分離(t403 前例に同じ)。
