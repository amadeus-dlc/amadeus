# Code Generation Plan — unit recommendation-core(U1)

## 拘束

- R-1 / ADR-1: 裁定結果は `unique` / `contested` / `none` の3種のみで表現する。第4の状態(「推奨なしだが進む」等)を型に追加しない。
- R-3: 外部表現からの復元は `parse` のみを入口とし、`Result<RecommendationOutcome, DecodeError>` を返す(project.md「Parse, Don't Validate」)。既定値補完をしない。
- R-8 / FR-4: history 段の競合(`uniqueOption` が `"conflict"`)は `contested` で終端する。`amadeus-intent-autonomy.ts:952` の次段への落下を廃止する。
- R-13 / ADR-1 Q2=B: ゲート導出器 `deriveGateRecommendation` は常に `unique("approve", basis)` を返す。contested/none を返す経路を持たない。
- R-6 / ADR-11: `RecommendationBasis.fingerprint` は本 unit では不透明な SHA-256 文字列として扱い、算出規則は code-generation への申し送り入力とする(本 unit のソースに算出実装を置かない)。

## TDD 順序(実施順)

1. `amadeus-recommendation.ts` 新規: unique/contested/none の判別ユニオン + smart constructor + parse/serialize/presentationOf を先に実装し、`t3116-recommendation-outcome.test.ts` で pin(179行、コミット `2c3e32de1`)。
2. round-trip プロパティ(R-5)を fast-check で追加(`t3116-recommendation-outcome.pbt.test.ts`、コミット `ef2283a93`)。
3. 梯子とゲートの配線: `DecisionCapabilityPort.elect/recommend` の戻り型を `RecommendationOutcome` へ、escalate 枝、history conflict → contested 終端、`deriveGateRecommendation`、`humanReservedDecision?` seam を実装(コミット `73cd3729d`)。実装前に `t3116-recommendation-ladder.test.ts` の型検査 22 件が Red であることを `bun run typecheck` で実測してから着手。
4. 発火頻度の census(R-16/ADR-9): 機構起因クラス(phase-gate 106 + WS 66 = 172、§13 0件確認 79)の fixture 群で contested 発火 0 件であることを実データ由来の corpus(`tests/helpers/recommendation-decision-points.ts`)で pin(コミット `8336873c0`)。
5. AUTO_DECIDED の実測(R-7): ラダーの戻り値ではなく実コーディネータを駆動し committed transaction を読む形で「escalate は AUTO_DECIDED を1件もコミットしない」ことを検証(コミット `e2258fb45`)。

各段で落ちる実証(FP-1〜FP-3)は注入 → 赤の実測 → revert を1セットで実施し、`git status --short packages/` 空を機械確認した。

## 検証・配送

- swarm batch 1(recommendation-core / presence-detection / s13-zero / merge-provenance / grant-ceremony / d6-investigation を並行実装)。
- referee: batch 1 の統合コミット `a8ff18f52 integrate bolt-recommendation-core (batch 1)` で `swarm-int-rfc0001` へ収束。
- worktree: `/Users/j5ik2o/Sources/j5ik2o.github.com/amadeus-dlc/amadeus/.amadeus/worktrees/bolt-recommendation-core`、branch `bolt-recommendation-core`、base `main@2eb94f1e3`。
